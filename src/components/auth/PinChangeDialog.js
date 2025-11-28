import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Alert, InputAdornment, } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { authService } from '../../services/authService';
import { apiService } from '../../services/apiService';
export default function PinChangeDialog({ open, onClose, onSuccess }) {
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        // Validation
        if (!newPin || newPin.length < 4 || newPin.length > 6) {
            setError('PIN must be 4-6 digits');
            return;
        }
        if (!/^\d+$/.test(newPin)) {
            setError('PIN must contain only numbers');
            return;
        }
        if (newPin !== confirmPin) {
            setError('PINs do not match');
            return;
        }
        setLoading(true);
        try {
            const session = authService.getCurrentSession();
            if (!session) {
                setError('Session expired. Please log in again.');
                setLoading(false);
                return;
            }
            console.log('🔐 Updating PIN for user:', session.userId, 'New PIN:', newPin);
            // Update user PIN via backend API
            const response = await apiService.changePin(session.userId, newPin);
            console.log('✅ PIN change API response:', response);
            if (!response || !response.success) {
                throw new Error(response?.message || 'Failed to change PIN - no success response');
            }
            console.log('✅ PIN updated successfully via backend API');
            // Update session to clear the flag
            const updatedSession = { ...session, pinResetRequired: false };
            authService.updateSession(updatedSession);
            console.log('✅ Session updated, calling onSuccess()');
            setLoading(false);
            onSuccess();
        }
        catch (err) {
            console.error('❌ Failed to update PIN:', err);
            setError(err.message || 'Failed to update PIN. Please try again.');
            setLoading(false);
        }
    };
    const handleClose = () => {
        if (!loading) {
            setNewPin('');
            setConfirmPin('');
            setError('');
            onClose();
        }
    };
    return (_jsx(Dialog, { open: open, onClose: handleClose, maxWidth: "sm", fullWidth: true, disableEscapeKeyDown: true, children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(DialogTitle, { children: "PIN Reset Required" }), _jsxs(DialogContent, { children: [_jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "You are using a temporary PIN. Please set a new PIN to continue." }), error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, children: error })), _jsx(TextField, { fullWidth: true, label: "New PIN", type: "password", value: newPin, onChange: (e) => {
                                const value = e.target.value.replace(/\D/g, ''); // Only numbers
                                if (value.length <= 6) {
                                    setNewPin(value);
                                }
                            }, margin: "normal", required: true, inputProps: { maxLength: 6, pattern: '[0-9]*' }, InputProps: {
                                startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(Lock, {}) })),
                            }, helperText: "Enter 4-6 digits" }), _jsx(TextField, { fullWidth: true, label: "Confirm New PIN", type: "password", value: confirmPin, onChange: (e) => {
                                const value = e.target.value.replace(/\D/g, ''); // Only numbers
                                if (value.length <= 6) {
                                    setConfirmPin(value);
                                }
                            }, margin: "normal", required: true, inputProps: { maxLength: 6, pattern: '[0-9]*' }, InputProps: {
                                startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(Lock, {}) })),
                            }, helperText: "Re-enter your new PIN" })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleClose, disabled: loading, children: "Cancel" }), _jsx(Button, { type: "submit", variant: "contained", disabled: loading, children: loading ? 'Updating...' : 'Set New PIN' })] })] }) }));
}
