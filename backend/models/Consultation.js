import mongoose from 'mongoose';

const consultationSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  doctorName: {
    type: String,
    required: true,
  },
  doctorSpecialty: {
    type: String,
    required: true,
  },
  patientName: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['upcoming', 'completed', 'cancelled', 'in-progress'],
    default: 'upcoming',
  },
  paymentId: {
    type: String,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  consultationFee: {
    type: Number,
    required: true,
  },
  notes: {
    type: String,
  },
  prescription: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
consultationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
consultationSchema.index({ patientId: 1, date: -1 });
consultationSchema.index({ doctorId: 1, date: -1 });

const Consultation = mongoose.model('Consultation', consultationSchema);

export default Consultation;