// /opt/dietarydb/backend/routes/patients.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all active patients
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM patient_info WHERE discharged = false ORDER BY wing, room_number'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Error fetching patients' });
  }
});

// Get patient by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM patient_info WHERE patient_id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ message: 'Error fetching patient' });
  }
});

// Create new patient
router.post('/', [
  authenticateToken,
  authorizeRole('Admin', 'Nurse'),
  body('patient_first_name').notEmpty().trim(),
  body('patient_last_name').notEmpty().trim(),
  body('wing').notEmpty().trim(),
  body('room_number').notEmpty().trim(),
  body('diet_type').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      patient_first_name,
      patient_last_name,
      wing,
      room_number,
      diet_type,
      ada_diet,
      food_allergies,
      fluid_restriction,
      fluid_restriction_amount,
      texture_modification
    } = req.body;
    
    // Check if room is occupied
    const existingPatient = await db.query(
      'SELECT patient_id FROM patient_info WHERE wing = $1 AND room_number = $2 AND discharged = false',
      [wing, room_number]
    );
    
    if (existingPatient.rows.length > 0) {
      return res.status(400).json({ message: 'Room is already occupied' });
    }
    
    // Create patient
    const result = await db.query(
      `INSERT INTO patient_info 
       (patient_first_name, patient_last_name, wing, room_number, diet_type, 
        ada_diet, food_allergies, fluid_restriction, fluid_restriction_amount, 
        texture_modification) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [patient_first_name, patient_last_name, wing, room_number, diet_type,
       ada_diet || false, food_allergies, fluid_restriction || false, 
       fluid_restriction_amount, texture_modification]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ message: 'Error creating patient' });
  }
});

// Update patient
router.put('/:id', [
  authenticateToken,
  authorizeRole('Admin', 'Nurse')
], async (req, res) => {
  try {
    const patientId = req.params.id;
    const updates = req.body;
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      if (key !== 'patient_id' && key !== 'created_date') {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    values.push(patientId);
    
    const result = await db.query(
      `UPDATE patient_info 
       SET ${updateFields.join(', ')}, modified_date = CURRENT_TIMESTAMP
       WHERE patient_id = $${paramCount} 
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ message: 'Error updating patient' });
  }
});

// Discharge patient
router.post('/:id/discharge', [
  authenticateToken,
  authorizeRole('Admin', 'Nurse')
], async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE patient_info 
       SET discharged = true, discharge_date = CURRENT_TIMESTAMP, modified_date = CURRENT_TIMESTAMP 
       WHERE patient_id = $1 AND discharged = false 
       RETURNING *`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found or already discharged' });
    }
    
    res.json({ message: 'Patient discharged successfully', patient: result.rows[0] });
  } catch (error) {
    console.error('Error discharging patient:', error);
    res.status(500).json({ message: 'Error discharging patient' });
  }
});

module.exports = router;