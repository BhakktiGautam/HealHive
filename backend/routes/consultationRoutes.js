import express from 'express';
import Consultation from '../models/Consultation.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/consultations/history - Get patient's consultation history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Find patient by userId
    const patient = await Patient.findOne({ userId });
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    // Get all consultations for this patient
    const consultations = await Consultation.find({ 
      patientId: patient._id 
    })
    .sort({ date: -1, time: -1 }) // Most recent first
    .lean();

    // Format response
    const formattedConsultations = consultations.map(consult => ({
      id: consult._id,
      doctorName: consult.doctorName,
      doctorSpecialty: consult.doctorSpecialty,
      doctorId: consult.doctorId,
      date: consult.date,
      time: consult.time,
      status: consult.status,
      paymentStatus: consult.paymentStatus,
      fee: consult.consultationFee,
      notes: consult.notes,
      prescription: consult.prescription,
      createdAt: consult.createdAt,
    }));

    res.status(200).json({
      success: true,
      consultations: formattedConsultations,
    });
  } catch (error) {
    console.error('Error fetching consultation history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consultation history',
      error: error.message,
    });
  }
});

// GET /api/consultations/:id - Get single consultation details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found',
      });
    }

    // Verify patient owns this consultation
    const patient = await Patient.findOne({ userId });
    if (!patient || consultation.patientId.toString() !== patient._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this consultation',
      });
    }

    res.status(200).json({
      success: true,
      consultation,
    });
  } catch (error) {
    console.error('Error fetching consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consultation',
      error: error.message,
    });
  }
});

// POST /api/consultations/:id/cancel - Cancel a consultation
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found',
      });
    }

    // Verify patient owns this consultation
    const patient = await Patient.findOne({ userId });
    if (!patient || consultation.patientId.toString() !== patient._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this consultation',
      });
    }

    // Can only cancel upcoming consultations
    if (consultation.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Only upcoming consultations can be cancelled',
      });
    }

    consultation.status = 'cancelled';
    consultation.updatedAt = new Date();
    await consultation.save();

    res.status(200).json({
      success: true,
      message: 'Consultation cancelled successfully',
      consultation,
    });
  } catch (error) {
    console.error('Error cancelling consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel consultation',
      error: error.message,
    });
  }
});

export default router;