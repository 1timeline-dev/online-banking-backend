import PDFDocument from "pdfkit";

const COLORS = {
  navy: "#12355B",
  blue: "#1F6FEB",
  lightBlue: "#EAF2FF",
  gray: "#5B6472",
  lightGray: "#E5E7EB",
  green: "#137333",
  red: "#B3261E",
  text: "#1F2937",
};

const formatAmount = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);

const formatDate = (date) =>
  new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

const drawTableHeader = (doc, y) => {
  doc.rect(50, y, 495, 24).fill(COLORS.navy);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(9);
  doc.text("DATE", 56, y + 8, { width: 82 });
  doc.text("TYPE", 145, y + 8, { width: 48 });
  doc.text("SENDER / RECEIVER", 201, y + 8, { width: 150 });
  doc.text("AMOUNT", 360, y + 8, { width: 82, align: "right" });
  doc.text("STATUS", 450, y + 8, { width: 88, align: "right" });
  return y + 24;
};

const drawPageHeader = (doc, user) => {
  doc.rect(0, 0, doc.page.width, 88).fill(COLORS.navy);

  doc.fillColor("white").font("Helvetica-Bold").fontSize(21);
  doc.text("ONLINE BANKING", 50, 28);

  doc.font("Helvetica").fontSize(10);
  doc.text("Account statement", 50, 54);

  doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(17);
  doc.text("Bank Statement", 50, 112);

  doc.font("Helvetica").fontSize(10).fillColor(COLORS.gray);
  doc.text(`Generated: ${formatDate(new Date())}`, 50, 140);

  doc.roundedRect(50, 166, 495, 86, 5).fill(COLORS.lightBlue);

  doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(10);
  doc.text(user.fullname, 64, 181);

  doc.font("Helvetica").fontSize(9).fillColor(COLORS.gray);
  doc.text(user.email, 64, 199);
  doc.text(`Account number: ${user.accountNumber}`, 64, 217);

  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(12);
  doc.text(`Balance: ${formatAmount(user.balance)}`, 345, 198, {
    width: 185,
    align: "right",
  });

  doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(13);
  doc.text("Transactions", 50, 278);

  return drawTableHeader(doc, 300);
};

const drawFooter = (doc, pageNumber) => {
  const y = doc.page.height - 42;

  doc.moveTo(50, y - 8)
    .lineTo(545, y - 8)
    .strokeColor(COLORS.lightGray)
    .stroke();

  doc.fillColor(COLORS.gray).font("Helvetica").fontSize(8);
  doc.text("This is a computer-generated bank statement.", 50, y);

  doc.text(`Page ${pageNumber}`, 460, y, {
    width: 85,
    align: "right",
  });
};

export const generatePDF = (user, transactions, res) => {
  const doc = new PDFDocument({
    margin: 50,
    size: "A4",
    bufferPages: true,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="bank-statement.pdf"'
  );

  doc.pipe(res);

  let y = drawPageHeader(doc, user);

  if (transactions.length === 0) {
    doc.fillColor(COLORS.gray)
      .font("Helvetica")
      .fontSize(10);

    doc.text(
      "No transactions found for this account.",
      50,
      y + 22
    );
  } else {
    transactions.forEach((transaction, index) => {

      const isDebit =
        transaction.sender?._id?.toString() ===
        user._id.toString();

      const counterparty = isDebit
        ? transaction.receiver
        : transaction.sender;

      const rowHeight = 36;

      if (y + rowHeight > doc.page.height - 70) {
        doc.addPage();
        y = drawPageHeader(doc, user);
      }

      if (index % 2 === 0) {
        doc.rect(50, y, 495, rowHeight).fill("#F8FAFC");
      }

      // Date
      doc.fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(8);

      doc.text(
        formatDate(transaction.createdAt),
        56,
        y + 8,
        {
          width: 82,
          height: 20,
        }
      );

      // Debit/Credit
      doc.fillColor(
        isDebit ? COLORS.red : COLORS.green
      ).font("Helvetica-Bold");

      doc.text(
        isDebit ? "DEBIT" : "CREDIT",
        145,
        y + 8,
        {
          width: 48,
        }
      );

      // Name + Account Number
      doc.fillColor(COLORS.text)
        .font("Helvetica");

      doc.text(
        `${counterparty?.fullname || "Unknown account"}\n${
          counterparty?.accountNumber || ""
        }`,
        201,
        y + 6,
        {
          width: 150,
          height: 28,
          ellipsis: true,
        }
      );

      // Amount
      doc.font("Helvetica-Bold");
      doc.text(
        formatAmount(transaction.amount),
        360,
        y + 8,
        {
          width: 82,
          align: "right",
        }
      );

      // Status
      if (transaction.status === "Successful") {
        doc.fillColor(COLORS.green);
      } else if (transaction.status === "Failed") {
        doc.fillColor(COLORS.red);
      } else {
        doc.fillColor(COLORS.gray);
      }

      doc.text(
        transaction.status,
        450,
        y + 8,
        {
          width: 88,
          align: "right",
        }
      );

      y += rowHeight;
    });
  }

  doc.fillColor(COLORS.navy)
    .font("Helvetica-Bold")
    .fontSize(12);

  doc.text(
    `Current Balance: ${formatAmount(user.balance)}`,
    50,
    y + 28
  );

  const pageCount = doc.bufferedPageRange().count;

  for (let page = 0; page < pageCount; page++) {
    doc.switchToPage(page);
    drawFooter(doc, page + 1);
  }

  doc.end();
};