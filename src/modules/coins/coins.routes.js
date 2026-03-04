const router  = require("express").Router();
const multer  = require("multer");
const auth    = require("../../middleware/auth");
const ctrl    = require("./coins.controller");

// Store CSV in memory (max 20 MB — ~50k numbers comfortably fit)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/coins/bulk-upload  — multipart CSV file
router.post("/bulk-upload", auth, upload.single("file"), ctrl.bulkUpload);

// GET  /api/coins/batches      — list past bulk batches (dashboard)
router.get("/batches", auth, ctrl.listBatches);

module.exports = router;