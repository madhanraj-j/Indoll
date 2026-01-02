const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(bodyParser.json());

const db = new sqlite3.Database("./scan.db");

// Create table
db.run(`
CREATE TABLE IF NOT EXISTS invoice_scan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id TEXT,
  invoice_no TEXT,
  lsp TEXT,
  serial_no INTEGER,
  scan_time DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

// Scan invoice API
app.post("/scan", (req, res) => {
  const { lot_id, invoice_no, lsp } = req.body;

  // Get next serial per LSP
  db.get(
    `SELECT COALESCE(MAX(serial_no),0)+1 AS nextSerial
     FROM invoice_scan
     WHERE lot_id = ? AND lsp = ?`,
    [lot_id, lsp],
    (err, row) => {
      if (err) return res.status(500).send(err);

      const serial = row.nextSerial;

      db.run(
        `INSERT INTO invoice_scan (lot_id, invoice_no, lsp, serial_no)
         VALUES (?,?,?,?)`,
        [lot_id, invoice_no, lsp, serial],
        () => {
          res.json({
            message: "Scanned successfully",
            serial_display: `${lsp}${serial}`
          });
        }
      );
    }
  );
});

app.get("/list/:lot_id", (req, res) => {
  db.all(
    `SELECT invoice_no, lsp, serial_no
     FROM invoice_scan
     WHERE lot_id = ?
     ORDER BY scan_time`,
    [req.params.lot_id],
    (err, rows) => res.json(rows)
  );
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
