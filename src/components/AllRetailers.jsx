"use client";

import { useContract } from "@/context/contractContext";
import { useEffect, useState } from "react";

const AllRetailers = () => {
  const { getAllRetailers, contract, getRetailerRequests } = useContract();
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retailerRequests,setRetailerRequests] = useState(0);

  const fetchRetailers = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const data = await getAllRetailers();
      const req = await getRetailerRequests();
      setRetailerRequests(req);

      const [addresses, names, locations, activeStatus] = data;

      const formattedRetailers = addresses.map((address, i) => ({
        address,
        name: names[i],
        location: locations[i],
        isApproved: activeStatus[i],
      }));

      setRetailers(formattedRetailers);
    } catch (error) {
      console.error("Error fetching retailers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetailers();
  }, [contract]);

  const totalRetailers = retailers.length;
  const approvedCount = retailers.filter((r) => r.isApproved).length;

  return (
    <div className="min-h-screen bg-[#1C2620] px-6 py-16 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#4A5D48] bg-[#8FA88A]/10 px-4 py-1.5 text-sm font-medium text-[#8FA88A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8FA88A]" />
              Retailer Registry
            </span>
            <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
              All Retailers
            </h1>
            <p className="mt-2 text-sm text-white/60">
              View and manage all registered retailers on-chain
            </p>
          </div>

          <button
            onClick={fetchRetailers}
            className="rounded-md bg-[#8FA88A] px-6 py-3 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776]"
          >
            🔄 Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border border-[#4A5D48] bg-[#243329] p-5">
            <p className="text-sm text-white/60">Total Retailers</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {totalRetailers}
            </p>
          </div>
          <div className="rounded-xl border border-[#4A5D48] bg-[#243329] p-5">
            <p className="text-sm text-white/60">Approved</p>
            <p className="mt-2 text-3xl font-bold text-[#8FA88A]">
              {approvedCount}
            </p>
          </div>
          <div className="rounded-xl border border-[#4A5D48] bg-[#243329] p-5">
            <p className="text-sm text-white/60">Pending</p>
            <p className="mt-2 text-3xl font-bold text-yellow-400">
              {retailerRequests.length} Pending
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 rounded-xl border border-dashed border-[#4A5D48] bg-[#243329]/50">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#8FA88A] border-t-transparent" />
            <p className="mt-4 text-white/60">Loading retailers...</p>
          </div>
        ) : retailers.length === 0 ? (
          <div className="text-center py-20 rounded-xl border border-dashed border-[#4A5D48] bg-[#243329]/50">
            <p className="text-white/60">No retailers registered yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {retailers.map((retailer, index) => (
              <div
                key={retailer.address}
                className="group flex items-center justify-between gap-4 rounded-xl border border-[#4A5D48] bg-[#243329] px-5 py-4 transition-all duration-300 hover:border-[#8FA88A]/50 hover:shadow-lg hover:shadow-[#8FA88A]/5"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#8FA88A]/10 text-sm font-bold text-[#8FA88A]">
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white capitalize truncate">
                        {retailer.name}
                      </h3>
                      {retailer.isApproved ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 border border-green-700/50 px-2 py-0.5 text-xs font-medium text-green-400">
                          <span className="h-1 w-1 rounded-full bg-green-400" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-900/40 border border-yellow-700/50 px-2 py-0.5 text-xs font-medium text-yellow-400">
                          <span className="h-1 w-1 rounded-full bg-yellow-400 animate-pulse" />
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs">
                      <span className="text-[#8FA88A]">
                        location: {retailer.location}
                      </span>
                      <span className="hidden sm:inline font-mono text-white/50 truncate">
                        {retailer.address.slice(0, 10)}...
                        {retailer.address.slice(-8)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(retailer.address);
                    alert("Address copied!");
                  }}
                  className="shrink-0 rounded-md border border-[#4A5D48] px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:border-[#8FA88A] hover:text-[#8FA88A]"
                >
                  Copy address
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllRetailers;
