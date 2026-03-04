const { parse } = require("csv-parse/sync");
const { v4: uuidv4 } = require("uuid");
const coinsQueue = require("./coins.queue");


function parsePhones(buffer) {
  const text = buffer.toString("utf8").trim();

  // Try CSV first
  let rows;
  try {
    rows = parse(text, { skip_empty_lines: true, trim: true, relax_quotes: true });
  } catch {
    // Fall back: treat each line as a number
    rows = text.split(/\r?\n/).map((l) => [l.trim()]);
  }

  const phones = [];
  for (const row of rows) {
    const val = String(row[0] ?? "").trim();
    // Skip header labels
    if (/^(phone|number|msisdn|mobile)$/i.test(val)) continue;
    if (val) phones.push(val);
  }
  return phones;
}


async function bulkUpload(buffer, chunkSize = 500) {
  const phones = parsePhones(buffer);
  if (!phones.length) throw Object.assign(new Error("No phone numbers found in file"), { status: 400 });

  const batchId = uuidv4();

  // Split into chunks to avoid huge single jobs
  for (let i = 0; i < phones.length; i += chunkSize) {
    const chunk = phones.slice(i, i + chunkSize);
    await coinsQueue.add({ batchId, phones: chunk }, {
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
    });
  }

  return { batchId, total: phones.length, chunks: Math.ceil(phones.length / chunkSize) };
}


async function listBatches() {
  const prisma = require("../../config/prisma");
  const rows = await prisma.coinBonus.groupBy({
    by: ["batchId"],
    _count: { _all: true },
    _min: { createdAt: true },
    orderBy: { _min: { createdAt: "desc" } },
    take: 50,
  });
  return rows.map((r) => ({
    batchId: r.batchId,
    credited: r._count._all,
    startedAt: r._min.createdAt,
  }));
}

module.exports = { bulkUpload, listBatches };