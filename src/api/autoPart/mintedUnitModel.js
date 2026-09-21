import mongoose from "mongoose";

const mintedUnitSchema = new mongoose.Schema(
  {
    autoPart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AutoPart",
      required: true,
      index: true,
    },
    tokenId: {
      type: Number,
      required: true,
      unique: true, 
      index: true,
    },
    retailerAddress: {
      type: String,
      lowercase: true,
      index: true,
    },
    transactionHash: {
      type: String,
    },
    mintedBy: {
      type: String,
      lowercase: true,
    },
  },
  { timestamps: true },
);

const MintedUnit = mongoose.model("MintedUnit", mintedUnitSchema);
export default MintedUnit;