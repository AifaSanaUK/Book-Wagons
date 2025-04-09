const PDFDocument = require("pdfkit");
const fs = require("fs");

const generatePDF = async (orders, filters) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filePath = `./reports/sales_report_${Date.now()}.pdf`;
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc
      .fontSize(20)
      .fillColor("#003366")
      .text("SALES REPORT", { align: "center", underline: true })
      .moveDown(0.8);

    if (filters && Object.keys(filters).length > 0) {
      const formattedFilters = JSON.stringify(filters, null, 2).replace(
        /[{}"]/g,
        "",
      );
      doc
        .fontSize(10)
        .fillColor("#444")
        .text(`Applied Filters: ${formattedFilters}`, { align: "center" })
        .moveDown(1);
    }

    const headers = ["ORDER ID", "DATE", "TOTAL", "DISCOUNT", "FINAL AMOUNT"];
    const columnWidths = [120, 90, 90, 90, 130];
    const rowHeight = 30;
    const tableStartY = doc.y;
    const tableWidth = columnWidths.reduce((a, b) => a + b, 0);

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("white")
      .rect(50, tableStartY, tableWidth, rowHeight)
      .fill("#003366");

    headers.forEach((header, i) => {
      const x = 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0) + 5;
      doc.text(header, x, tableStartY + 8, {
        width: columnWidths[i] - 10,
        align: "left",
      });
    });

    let currentY = tableStartY + rowHeight;
    doc.font("Helvetica").fontSize(10).fillColor("black");

    orders.forEach((order, index) => {
      if (currentY + rowHeight > doc.page.height - 50) {
        doc.addPage();
        currentY = 50;

        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor("white")
          .rect(50, currentY, tableWidth, rowHeight)
          .fill("#003366");

        headers.forEach((header, i) => {
          const x =
            50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0) + 5;
          doc.text(header, x, currentY + 8, {
            width: columnWidths[i] - 10,
            align: "left",
          });
        });

        currentY += rowHeight;
      }

      const bgColor = index % 2 === 0 ? "#f8f8f8" : "white";
      doc.fillColor(bgColor).rect(50, currentY, tableWidth, rowHeight).fill();

      const rowData = [
        order.orderId || "N/A",
        new Date(order.createdOn).toLocaleDateString("en-IN"),
        `₹${(order.totalPrice || 0).toFixed(2)}`,
        `₹${(order.discountAmount || 0).toFixed(2)}`,
        `₹${(order.finalAmount || 0).toFixed(2)}`,
      ];

      doc.fillColor("black");
      rowData.forEach((cell, colIndex) => {
        const x =
          50 + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) + 5;
        doc.text(cell, x, currentY + 8, {
          width: columnWidths[colIndex] - 10,
          align: "left",
        });
      });

      doc
        .lineWidth(0.3)
        .strokeColor("#cccccc")
        .rect(50, currentY, tableWidth, rowHeight)
        .stroke();

      currentY += rowHeight;
    });

    const totals = {
      orders: orders.length,
      sales: orders.reduce((sum, o) => sum + (o.finalAmount || 0), 0),
      discount: orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0),
    };

    doc.fillColor("#222").rect(50, currentY, tableWidth, rowHeight).fill();

    doc
      .font("Helvetica-Bold")
      .fillColor("white")
      .text(`TOTAL ORDERS: ${totals.orders}`, 55, currentY + 10)
      .text(
        `TOTAL DISCOUNT: ₹${totals.discount.toFixed(2)}`,
        255,
        currentY + 10,
      )
      .text(
        `GRAND TOTAL: ₹${totals.sales.toFixed(2)}`,
        tableWidth + 20 - 160,
        currentY + 10,
        { align: "right" },
      );

    doc.end();

    stream.on("finish", () => resolve(filePath));
    stream.on("error", (err) => reject(err));
  });
};

// ----------------------------------------------------------------------------------------------------

const XLSX = require("xlsx");
// ----------------------------------------------------------------------------------------------------

const generateExcel = (orders, filters) => {
  const worksheetData = orders.map((order) => ({
    OrderID: order.orderId,
    Date: new Date(order.createdOn).toLocaleDateString(),
    Total: order.totalPrice,
    Discount: order.discountAmount,
    FinalAmount: order.finalAmount,
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "SalesReport");

  const filePath = `./reports/sales_report_${Date.now()}.xlsx`;
  XLSX.writeFile(workbook, filePath);
  return filePath;
};

module.exports = {
  generateExcel,
  generatePDF,
};
