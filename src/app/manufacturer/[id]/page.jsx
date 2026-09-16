"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useContract } from "@/context/contractContext";
import { autopartApi } from "@/lib/api/autopartApi";
import toast from "react-hot-toast";
import { CoinsIcon } from "lucide-react";

const STATUS_NAMES = [
  "NEW",
  "RECALLED",
  "DEFECTIVE_RETURNED",
  "REPAIRED",
  "REFURBISHED",
];

const SALE_STATUS_NAMES = ["UNSOLD", "IN_TRANSIT", "SOLD", "RETURNED"];

const Page = () => {
  const { id } = useParams();
  const router = useRouter();
  const { contract, getSaleStatus, getNFTCustodian } = useContract();

  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chainData, setChainData] = useState(null);

  // ========== FETCH PART FROM DB + CHAIN ==========
  useEffect(() => {
    const fetchPart = async () => {
      if (!id) return;
      try {
        setLoading(true);

        // 1. Fetch part from MongoDB
        const result = await autopartApi.getById(id);
        const dbPart = result.data?.autoPart;
        setPart(dbPart);

        // 2. If minted, fetch on-chain data
        if (
          dbPart?.tokenId !== undefined &&
          dbPart?.tokenId !== null &&
          contract
        ) {
          const [saleStatus, custodian] = await Promise.all([
            getSaleStatus(dbPart.tokenId),
            getNFTCustodian(dbPart.tokenId),
          ]);

          setChainData({
            saleStatus: SALE_STATUS_NAMES[Number(saleStatus)],
            custodian,
          });
        }
      } catch (error) {
        console.error("Failed to load part:", error);
        toast.error("Failed to load part details");
      } finally {
        setLoading(false);
      }
    };

    fetchPart();
  }, [id, contract]);

  // ========== LOADING ==========
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1C2620] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#8FA88A] border-t-transparent" />
          <p className="mt-4 text-white/60">Loading part details...</p>
        </div>
      </div>
    );
  }

  // ========== NOT FOUND ==========
  if (!part) {
    return (
      <div className="min-h-screen bg-[#1C2620] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">📭</div>
          <h1 className="text-3xl font-bold text-white mb-4">Part Not Found</h1>
          <p className="text-white/60 mb-6">
            The part you're looking for doesn't exist or was removed.
          </p>
          <button
            onClick={() => router.push("/manufacturer")}
            className="rounded-md bg-[#8FA88A] px-6 py-3 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776]"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isMinted = part.tokenId !== undefined && part.tokenId !== null;

  return (
    <div className="min-h-screen bg-[#1C2620] px-6 py-16 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {/* ========== BACK BUTTON ========== */}
        <button
          onClick={() => router.push("/manufacturer")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          ← Back to Dashboard
        </button>

        {/* ========== HEADER ========== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#4A5D48] bg-[#8FA88A]/10 px-4 py-1.5 text-sm font-medium text-[#8FA88A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8FA88A]" />
              Part Details
            </span>
            <h1 className="mt-4 text-3xl font-bold text-white">
              {part.partName}
            </h1>
            <p className="mt-1 text-sm text-white/60">{part.brandName}</p>
          </div>

          {isMinted ? (
            <span className="self-start rounded-full bg-green-900/50 border border-green-700/50 px-4 py-2 text-sm font-medium text-green-400">
              <CoinsIcon/> Token #{part.tokenId}
            </span>
          ) : (
            <span className="self-start rounded-full bg-yellow-900/50 border border-yellow-700/50 px-4 py-2 text-sm font-medium text-yellow-400">
               Not Minted Yet
            </span>
          )}
        </div>

        {/* ========== MAIN CONTENT GRID ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ========== LEFT COLUMN: IMAGE ========== */}
          <div className="space-y-6">
            <div className="rounded-xl border border-[#4A5D48] bg-[#243329] overflow-hidden">
              <img
                src={part.image?.url || part.thumbnail}
                alt={part.partName}
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Price + Quantity Card */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#4A5D48] bg-[#243329] p-5">
                <p className="text-xs text-white/50">Price</p>
                <p className="mt-2 text-2xl font-bold text-[#8FA88A]">
                  ${part.price}
                </p>
              </div>
              <div className="rounded-xl border border-[#4A5D48] bg-[#243329] p-5">
                <p className="text-xs text-white/50">Quantity</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {part.quantity}
                </p>
              </div>
            </div>
          </div>

          {/* ========== RIGHT COLUMN: DETAILS ========== */}
          <div className="space-y-6">
            {/* Description */}
            {part.description && (
              <div className="rounded-xl border border-[#4A5D48] bg-[#243329] p-5">
                <h3 className="text-sm font-semibold text-white/80 mb-2">
                  📝 Description
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {part.description}
                </p>
              </div>
            )}

            {/* Part Info */}
            <div className="rounded-xl border border-[#4A5D48] bg-[#243329] p-5">
              <h3 className="text-sm font-semibold text-white/80 mb-4">
                📦 Part Information
              </h3>
              <div className="space-y-3">
                <Row label="Category" value={part.category} capitalize />
                <Row label="Brand" value={part.brandName} />
                <Row
                  label="Created"
                  value={new Date(part.createdAt).toLocaleString()}
                />
                <Row
                  label="Last Updated"
                  value={new Date(part.updatedAt).toLocaleString()}
                />
              </div>
            </div>

            {/* On-Chain Status */}
            <div className="rounded-xl border border-[#4A5D48] bg-[#243329] p-5">
              <h3 className="text-sm font-semibold text-white/80 mb-4">
                🔗 On-Chain Status
              </h3>
              <div className="space-y-3">
                <Row
                  label="Minted"
                  value={isMinted ? " Yes" : " Not yet"}
                />
                {isMinted && (
                  <Row label="Token ID" value={`#${part.tokenId}`} />
                )}
                {chainData?.saleStatus && (
                  <Row
                    label="Sale Status"
                    value={chainData.saleStatus}
                  />
                )}
                {chainData?.custodian && (
                  <Row
                    label="Custodian"
                    value={`${chainData.custodian.slice(0, 8)}...${chainData.custodian.slice(-6)}`}
                    mono
                  />
                )}
              </div>
            </div>

            {/* IPFS Metadata */}
            <div className="rounded-xl border border-[#4A5D48] bg-[#243329] p-5">
              <h3 className="text-sm font-semibold text-white/80 mb-4">
                🌐 IPFS Metadata
              </h3>
              <div className="space-y-3">
                {part.tokenURI && (
                  <Row
                    label="Token URI"
                    value={`${part.tokenURI.slice(0, 32)}...`}
                    mono
                  />
                )}
                {part.metadataHash && (
                  <Row
                    label="Metadata Hash"
                    value={`${part.metadataHash.slice(0, 22)}...`}
                    mono
                  />
                )}
                {part.metadataCid && (
                  <Row
                    label="IPFS CID"
                    value={`${part.metadataCid.slice(0, 22)}...`}
                    mono
                  />
                )}
              </div>

              {/* View on IPFS button */}
              {part.tokenURI && (
                <a
                  href={part.tokenURI.replace(
                    "ipfs://",
                    "https://gateway.pinata.cloud/ipfs/"
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-xs text-[#8FA88A] hover:text-[#7A9776] transition-colors"
                >
                  View metadata on IPFS →
                </a>
              )}
            </div>

            {/* Etherscan Link */}
            {isMinted && (
              <div className="text-center">
                <a
                  href={`https://sepolia.etherscan.io/token/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}?a=${part.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-[#8FA88A] hover:text-[#7A9776] transition-colors"
                >
                  View on Etherscan →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== Small Helper Row Component ==========
const Row = ({ label, value, mono = false, capitalize = false }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-xs text-white/50 shrink-0">{label}</span>
    <span
      className={`text-xs text-white/80 text-right break-all ${
        mono ? "font-mono" : ""
      } ${capitalize ? "capitalize" : ""}`}
    >
      {value}
    </span>
  </div>
);

export default Page;