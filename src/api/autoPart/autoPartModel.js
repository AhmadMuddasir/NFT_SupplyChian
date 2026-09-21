import mongoose from "mongoose";

const autoPartSchema = new mongoose.Schema(
  {
    partName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    brandName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "engine",
        "brake",
        "suspension",
        "electrical",
        "body",
        "interior",
        "other",
      ],
      default: "other",
    },
    image: {
      url: {
        type: String,
        required: true,
      },
      ipfsHash: {
        type: String,
        required: true,
      },
    },
    thumbnail: {
      type: String,
    },
    price: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 0,
    },
    specs: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    tokenURI: {
      type: String,
    },
    metadataHash: {
      type: String,
    },
    metadataCid: {
      type: String,
    },
    tokenId: {
      type: Number,
      sparse: true,
      index: true,
    },
    contractAddress: {
      type: String,
      required: true,
    },
    trackingNumber: {
      type: String,
      sparse: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 0,
    },
    mintedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      address: {
        type: String,
        lowercase: true,
        index: true,
      },
      role: {
        type: String,
        enum: ["manufacturer", "admin"],
        default: "manufacturer",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

autoPartSchema.index({
  partName: "text",
  brandName: "text",
});

autoPartSchema.virtual("remainingQuantity").get(function () {
  return Math.max(this.quantity - this.mintedCount, 0);
});
autoPartSchema.virtual("isInStock").get(function () {
  return this.remainingQuantity > 0;
});

autoPartSchema.statics.findByTokenId = function (tokenId) {
  return this.findOne({ tokenId });
};

const AutoPart = mongoose.model("AutoPart", autoPartSchema);

export default AutoPart;
