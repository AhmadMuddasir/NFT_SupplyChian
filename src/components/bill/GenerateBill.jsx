"use client";

import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import QRCode from "react-qr-code";
import Barcode from "react-barcode";

const GenerateBill = ({ part, contractAddress, onClose }) => {
  const billRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  console.log("Generate Parts")

  const handlePrint = useReactToPrint({
    contentRef: billRef,
    documentTitle: `AutoPart-Bill-${part.tokenId ?? part._id}`,
  });

  const verificationUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/customer?tokenId=${part.tokenId ?? part._id}`
      : `http://localhost:3000/customer?tokenId=${part.tokenId ?? part._id}`;

  const billId = part.tokenId !== undefined && part.tokenId !== null
    ? `AP-${String(part.tokenId).padStart(6, "0")}`
    : `AP-${part._id?.slice(-6).toUpperCase()}`;

  const barcodeValue = `AUTOPART-${part.tokenId ?? part._id}`;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md border border-[#4A5D48] px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-[#4A5D48]/20 hover:text-white"
      >
         Generate Bill
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white text-black shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold hover:bg-gray-300"
            >
              ✕
            </button>

            <div ref={billRef} className="p-10 print:p-6">

              <div className="flex items-start justify-between border-b-2 border-black pb-4">
                <div>
                  <h1 className="text-2xl font-bold">AutoPart Supply Chain</h1>
                  <p className="text-xs text-gray-600">
                    Blockchain-Verified Auto Parts
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Contract: {contractAddress?.slice(0, 10)}...
                    {contractAddress?.slice(-8)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Bill No.</p>
                  <p className="text-lg font-bold">{billId}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

            
              <div className="mt-6 grid grid-cols-2 gap-6">
              {/* part img */}
                <div>
                  {part.image?.url && (
                    <img
                      src={part.image.url}
                      alt={part.partName}
                      className="h-40 w-40 rounded-md border border-gray-300 object-cover"
                    />
                  )}

                  <div className="mt-4 inline-block rounded-md border border-gray-300 bg-white p-2">
                    <QRCode value={verificationUrl} size={110} />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-500">
                    Scan to verify on-chain
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <DetailRow label="Part Name" value={part.partName} />
                  <DetailRow label="Brand" value={part.brandName} />
                  <DetailRow label="Category" value={part.category} />
                  <DetailRow
                    label="Token ID"
                    value={part.tokenId !== undefined && part.tokenId !== null ? `#${part.tokenId}` : "Not Minted"}
                  />
                  <DetailRow label="Unit Price" value={`$${part.price}`} />
                  <DetailRow label="Quantity" value={part.quantity} />
                  <DetailRow
                    label="Total"
                    value={`$${(Number(part.price) * Number(part.quantity)).toFixed(2)}`}
                    bold
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-gray-300 pt-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Blockchain Reference
                </p>
                <div className="space-y-1 text-[11px] font-mono break-all text-gray-700">
                  <p>
                    <span className="font-semibold">Metadata Hash:</span>{" "}
                    {part.metadataHash || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Token URI:</span>{" "}
                    {part.tokenURI || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">IPFS CID:</span>{" "}
                    {part.metadataCid || "—"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col items-center border-t border-gray-300 pt-4">
                <Barcode
                  value={barcodeValue}
                  format="CODE128"
                  width={1.6}
                  height={60}
                  fontSize={12}
                  displayValue
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  Scan with any barcode scanner
                </p>
              </div>

              <div className="mt-6 border-t border-gray-300 pt-3 text-center text-[10px] text-gray-500">
                <p>
                  This part is secured on Ethereum Sepolia. Verify at{" "}
                  {verificationUrl}
                </p>
                <p className="mt-1">
                  © {new Date().getFullYear()} AutoPart Supply Chain
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white px-6 py-4">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="rounded-md bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                 Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const DetailRow = ({ label, value, bold = false }) => (
  <div className="flex justify-between gap-4 border-b border-dotted border-gray-300 pb-1">
    <span className="text-gray-600">{label}:</span>
    <span className={`${bold ? "font-bold" : "font-medium"} text-right`}>
      {value}
    </span>
  </div>
);

export default GenerateBill;