"use client";

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export const usePinataUpload = () => {
  const [loading, setLoading] = useState();

  const uploadToPinata = async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          headers: {
            pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
            pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const ipfsHash = response.data.IpfsHash;
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      console.log("file Uploaded:", ipfsHash);
      return { ipfsHash, gatewayUrl };
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload file to IPFS");
    } finally {
      setLoading(false);
    }
  };

  const uploadJSON = async (metadata) => {
    setLoading(true);
    try {
      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        metadata,
        {
          headers: {
            pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
            pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY,
            "Content-Type": "application/json",
          },
        },
      );
      const ipfsHash = response.data.IpfsHash;
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

      return { ipfsHash, gatewayUrl };
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload metadata to IPFS");
    } finally {
      setLoading(false);
    }
  };
  return { uploadToPinata, uploadJSON, loading };
};
