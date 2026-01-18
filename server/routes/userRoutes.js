const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/getMed', userController.getMeds);
router.post('/addMed', userController.createMed);

router.post('/createMed', userController.createMed);

router.get('/meds', userController.getMeds);
router.get('/meds/:id', userController.getMedById);
router.post('/meds', userController.createMed);
router.put('/meds/:id', userController.updateMed);
router.delete('/meds/:id', userController.deleteMed);

module.exports = router;
