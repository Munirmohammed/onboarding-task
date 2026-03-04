const service = require("./coins.service");
const config  = require("../../config");

exports.bulkUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Send a CSV as multipart field 'file'." });
    }
    const result = await service.bulkUpload(req.file.buffer, config.coins.batchSize);
    res.status(202).json({ message: "Bulk upload accepted, processing in background.", ...result });
  } catch (e) { next(e); }
};

exports.listBatches = async (req, res, next) => {
  try {
    res.json(await service.listBatches());
  } catch (e) { next(e); }
};