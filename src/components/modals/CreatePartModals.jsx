"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { usePinataUpload } from "@/hooks/usePinataUpload";
import { autopartApi } from "@/lib/api/autopartApi";
import { ethers } from "ethers";
import toast from "react-hot-toast";


const CreatePartModal = ({ isOpen, onClose, onSuccess }) => {
  const { address } = useAccount();
  const { uploadToPinata, uploadJSON, loading } = usePinataUpload();
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    partName: "",
    brandName: "",
    description: "",
    category: "other",
    price: 0,
    quantity: 1,
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!image) {
      toast.error("Please select an image");
      return;
    }

    if (!formData.partName || !formData.brandName) {
      toast.error("Please fill in all required fields");
      return;
    }

    const toastId = toast.loading("Creating part...");

    try {
     
      const imageResult = await uploadToPinata(image);
      console.log(" Image uploaded:", imageResult.ipfsHash);

     
      const metadata = {
        name: formData.partName,
        brandName: formData.brandName,
        description: formData.description || "",
        category: formData.category || "other",
        price: formData.price || 0,
        quantity: formData.quantity || 1,
        image: imageResult.gatewayUrl,
        createdBy: address || "",
        createdAt: new Date().toISOString(),
      };

     
      const metadataResult = await uploadJSON(metadata);
      console.log(" Metadata uploaded:", metadataResult.ipfsHash);

    
      const metadataHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(metadata))
      );

     
      const payload = {
        ...formData,
        image: {
          url: imageResult.gatewayUrl,
          ipfsHash: imageResult.ipfsHash,
        },
        thumbnail: imageResult.gatewayUrl,
        tokenURI: `ipfs://${metadataResult.ipfsHash}`,
        metadataHash: metadataHash,
        metadataCid: metadataResult.ipfsHash,
        contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
        walletAddress: address,
      };

      console.log("📤 Sending to backend:", payload);
      const result = await autopartApi.create(payload);

      toast.success(" Part created successfully!", { id: toastId });

 
      setFormData({
        partName: "",
        brandName: "",
        description: "",
        category: "other",
        price: 0,
        quantity: 1,
      });
      setImage(null);
      setImagePreview(null);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error:", error);
       console.log(error.response?.data);
      toast.error(
        error.response?.data?.message || error.message || "Failed to create part",
        { id: toastId }
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-[#1C2620] p-6 shadow-xl border border-[#4A5D48]">
    
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create New Part</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Part Image *
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full rounded-md border border-[#4A5D48] bg-[#243329] p-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#8FA88A] file:text-[#1C2620] hover:file:bg-[#7A9776]"
              required
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="mt-2 h-32 w-32 rounded-md object-cover"
              />
            )}
          </div>

         
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Part Name *
            </label>
            <input
              type="text"
              name="partName"
              value={formData.partName}
              onChange={handleChange}
              className="w-full rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-2 text-white placeholder-white/30 focus:border-[#8FA88A] focus:outline-none transition-colors"
              placeholder="e.g., Brake Pad Set"
              required
            />
          </div>

         
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Brand Name *
            </label>
            <input
              type="text"
              name="brandName"
              value={formData.brandName}
              onChange={handleChange}
              className="w-full rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-2 text-white placeholder-white/30 focus:border-[#8FA88A] focus:outline-none transition-colors"
              placeholder="e.g., Acme Motors"
              required
            />
          </div>

      
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-2 text-white placeholder-white/30 focus:border-[#8FA88A] focus:outline-none transition-colors resize-none"
              placeholder="Part description..."
            />
          </div>

   
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-2 text-white focus:border-[#8FA88A] focus:outline-none transition-colors"
            >
              <option value="engine">Engine</option>
              <option value="brake">Brake</option>
              <option value="suspension">Suspension</option>
              <option value="electrical">Electrical</option>
              <option value="body">Body</option>
              <option value="interior">Interior</option>
              <option value="other">Other</option>
            </select>
          </div>

   
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Price (USD)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-2 text-white placeholder-white/30 focus:border-[#8FA88A] focus:outline-none transition-colors"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-2 text-white placeholder-white/30 focus:border-[#8FA88A] focus:outline-none transition-colors"
                placeholder="1"
                min="1"
              />
            </div>
          </div>

      
          <div className="flex gap-3 pt-4 border-t border-[#4A5D48]">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-[#8FA88A] px-4 py-2.5 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Part"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-[#4A5D48] px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-[#4A5D48]/20 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePartModal;