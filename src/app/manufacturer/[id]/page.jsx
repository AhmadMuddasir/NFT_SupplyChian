"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useContract } from "@/context/contractContext";
import { autopartApi } from "@/lib/api/autopartApi";
import toast from "react-hot-toast";
import { Edit } from "lucide-react";
import { Trash } from "lucide-react";
import GenerateBill from "@/components/bill/GenerateBill";

const STATUS_NAMES = [
  "NEW",
  "RECALLED",
  "DEFECTIVE_RETURNED",
  "REPAIRED",
  "REFURBISHED",
];

const SALE_STATUS_NAMES = ["UNSOLD", "IN_TRANSIT", "SOLD", "RETURNED"];

const CATEGORIES = [
  "engine",
  "brake",
  "suspension",
  "electrical",
  "body",
  "interior",
  "other",
];

const Page = () => {
  const { id } = useParams();
  const router = useRouter();
  const { contract, getSaleStatus, getNFTCustodian } = useContract();

  const [part, setPart] = useState(null);
  console.log(part)
  const [loading, setLoading] = useState(true);
  const [chainData, setChainData] = useState(null);

  // edit
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  //
  const fetchPart = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const result = await autopartApi.getById(id);
      const dbPart = result.data?.autoPart;
      setPart(dbPart);

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

  useEffect(() => {
    fetchPart();
  }, [id, contract]);

  const openEdit = () => {
    setEditForm({
      partName: part.partName || "",
      brandName: part.brandName || "",
      description: part.description || "",
      category: part.category || "other",
      price: part.price ?? 0,
      quantity: part.quantity ?? 0,
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.partName.trim() || !editForm.brandName.trim()) {
      toast.error("Part name and brand are required");
      return;
    }

    setSavingEdit(true);
    const toastId = toast.loading("Saving changes...");

    try {
      await autopartApi.update(id, {
        partName: editForm.partName.trim(),
        brandName: editForm.brandName.trim(),
        description: editForm.description,
        category: editForm.category,
        price: Number(editForm.price),
        quantity: Number(editForm.quantity),
      });

      toast.success(" Part updated", { id: toastId });
      setIsEditOpen(false);
      await fetchPart();
    } catch (error) {
      console.error("Update error:", error);
      toast.error(error?.response?.data?.message || "Failed to update part", {
        id: toastId,
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const toastId = toast.loading("Deleting part...");

    try {
      await autopartApi.delete(id);
      toast.success(" Part deleted", { id: toastId });
      setIsDeleteOpen(false);
      router.push("/manufacturer");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error?.response?.data?.message || "Failed to delete part", {
        id: toastId,
      });
    } finally {
      setDeleting(false);
    }
  };

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
        <button
          onClick={() => router.push("/manufacturer")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          ← Back to Dashboard
        </button>

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

          <div className="flex flex-wrap items-center gap-3 self-start">

            <button
              onClick={openEdit}
              className="rounded-md border border-[#4A5D48] px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-[#4A5D48]/20 hover:text-white"
            >
              <Edit /> Edit
            </button>
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="rounded-md border border-red-700/50 bg-red-900/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/40"
            >
              <Trash /> Delete
            </button>
                <GenerateBill
                  part={part}
                  contractAddress={process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}
                />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            <div className="rounded-xl border border-[#4A5D48] bg-[#243329] overflow-hidden">
              <img
                src={part.image?.url || part.thumbnail}
                alt={part.partName}
                className="w-full h-auto object-cover"
              />
            </div>

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

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {part.description && (
              <div className="rounded-xl border border-[#4A5D48] bg-[#243329] p-5">
                <h3 className="text-sm font-semibold text-white/80 mb-2">
                  Description
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {part.description}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-[#4A5D48] bg-[#243329] p-5">
              <h3 className="text-sm font-semibold text-white/80 mb-4">
                Part Information
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

            <div className="rounded-xl border border-[#4A5D48] bg-[#243329] p-5">
              <h3 className="text-sm font-semibold text-white/80 mb-4">
                🔗 On-Chain Status
              </h3>
              <div className="space-y-3">
                <Row
                  label="Minted"
                  value={isMinted ? "✅ Yes" : "⏳ Not yet"}
                />
                {isMinted && (
                  <Row label="Token ID" value={`#${part.tokenId}`} />
                )}
                {chainData?.saleStatus && (
                  <Row label="Sale Status" value={chainData.saleStatus} />
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

              {part.tokenURI && (
                <a
                  href={part.tokenURI.replace(
                    "ipfs://",
                    "https://gateway.pinata.cloud/ipfs/",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-xs text-[#8FA88A] hover:text-[#7A9776] transition-colors"
                >
                  View metadata on IPFS →
                </a>
              )}
            </div>

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

      {isEditOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-[#4A5D48] bg-[#1C2620] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Edit Part</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                disabled={savingEdit}
                className="text-white/60 hover:text-white disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Part Name *">
                <input
                  type="text"
                  value={editForm.partName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, partName: e.target.value })
                  }
                  className="w-full rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-2 text-sm text-white focus:border-[#8FA88A] focus:outline-none"
                />
              </Field>

              <Field label="Brand Name *">
                <input
                  type="text"
                  value={editForm.brandName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, brandName: e.target.value })
                  }
                  className="w-full rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-2 text-sm text-white focus:border-[#8FA88A] focus:outline-none"
                />
              </Field>

              <Field label="Description">
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="w-full resize-none rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-2 text-sm text-white focus:border-[#8FA88A] focus:outline-none"
                />
              </Field>

              <Field label="Category">
                <select
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category: e.target.value })
                  }
                  className="w-full rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-2 text-sm text-white focus:border-[#8FA88A] focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Price (USD)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) =>
                      setEditForm({ ...editForm, price: e.target.value })
                    }
                    className="w-full rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-2 text-sm text-white focus:border-[#8FA88A] focus:outline-none"
                  />
                </Field>
                <Field label="Quantity">
                  <input
                    type="number"
                    min="0"
                    value={editForm.quantity}
                    onChange={(e) =>
                      setEditForm({ ...editForm, quantity: e.target.value })
                    }
                    className="w-full rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-2 text-sm text-white focus:border-[#8FA88A] focus:outline-none"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex-1 rounded-md bg-[#8FA88A] px-4 py-2.5 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776] disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setIsEditOpen(false)}
                disabled={savingEdit}
                className="rounded-md border border-[#4A5D48] px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-[#4A5D48]/20 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-md rounded-lg border border-red-700/50 bg-[#1C2620] p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-900/30 text-xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Part?</h3>
                <p className="mt-1 text-sm text-white/60">
                  This will remove{" "}
                  <strong className="text-white">{part.partName}</strong> from
                  your dashboard. It won't affect any NFTs already minted
                  on-chain.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>

              <button
                onClick={() => setIsDeleteOpen(false)}
                disabled={deleting}
                className="rounded-md border border-[#4A5D48] px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-[#4A5D48]/20 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}      
    </div>
  );
};

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

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-white/80 mb-1">
      {label}
    </label>
    {children}
  </div>
);

export default Page;
