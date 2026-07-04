import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    uid: {
      type: String, // Firebase UID
      required: true,
      unique: true,
    },

    // Personal Info
    fullName: String,
    age: Number,
    gender: String,
    bloodGroup: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    pincode: String,

    emergencyName: String,
    emergencyContact: String,

    // Medical Info
    selectedDisease: String,
    otherDisease: String,
    symptoms: String,
    allergies: String,
    currentMedications: String,
    specialty: String,

    // Files (only metadata, not files)
    // backend/models/Patient.js

medicalDocuments: {
  type: [
    {
      id: Number,
      name: String,
      size: String,
      type: String,
      url: String,
      date: String,
    },
  ],
  default: [], // Ensures it's always an array even if empty
},
  },
  { timestamps: true }
);

export default mongoose.model("Patient", patientSchema);
