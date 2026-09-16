"use client";

import React from "react";
import MintPartButton from "@/components/parts/MintPartButton";
import { useRouter } from "next/navigation";


const ManufacturerParts = ({
  loadingParts = false,
  parts = [],
  onOpenModal,
  onSuccess,
}) => {

    const router = useRouter();

  return (
    <div className="mt-6 w-full px-2 sm:px-4">
      {loadingParts ? (
        <div className="text-center py-20">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#8FA88A] border-t-transparent" />
          <p className="mt-4 text-white/60">Loading parts...</p>
        </div>
      ) : parts.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-xl border border-dashed border-[#4A5D48] bg-[#243329]/50">
          <p className="text-white/60 mb-4">
            No parts created yet. Start by creating your first part!
          </p>
          <button
            onClick={onOpenModal}
            className="rounded-md bg-[#8FA88A] px-6 py-3 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776]"
          >
            + Create First Part
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {parts.map((part) => (
            <div
              key={part._id}
               onClick={() => router.push(`/manufacturer/${part._id}`)}
              className="flex flex-col justify-between rounded-xl border border-[#4A5D48] bg-[#243329] overflow-hidden hover:border-[#8FA88A]/50 transition-colors"
            >
              {/* Image Container: Full visibility with object-contain */}
              <div className="relative h-48 w-full bg-[#1C2620]/80 p-2 flex items-center justify-center">
                <img
                  src={part.image?.url || part.thumbnail}
                  alt={part.partName}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Card Body */}
              <div className="p-4 flex flex-col flex-1 justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-white truncate">
                      {part.partName}
                    </h3>
                    {part.tokenId ? (
                      <span className="shrink-0 rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-400">
                        Token #{part.tokenId}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-yellow-900/50 px-2 py-0.5 text-xs text-yellow-400">
                        Not minted
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/60 mt-1 truncate">
                    {part.brandName}
                  </p>
                  <p className="text-xs text-white/40 mt-2">
                    {part.category} · ${part.price} · Qty {part.quantity}
                  </p>
                </div>

                <div className="mt-4 pt-2" onClick={(e) => e.stopPropagation()}>
                  <MintPartButton
                    partId={part._id}
                    tokenId={part.tokenId}
                    tokenURI={part.tokenURI}
                    metadataHash={part.metadataHash}
                    onSuccess={onSuccess}
                  />
                </div>
                <p className="mt-3 text-xs text-[#8FA88A] text-center">
                  Click card to view details →
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManufacturerParts;