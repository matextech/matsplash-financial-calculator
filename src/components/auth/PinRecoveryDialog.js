import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Alert, Box, Stepper, Step, StepLabel, InputAdornment, IconButton, } from '@mui/material';
import { Security as SecurityIcon, Lock as LockIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { apiService } from '../../services/apiService';
export default function PinRecoveryDialog({ open, onClose, onSuccess }) {
    const [step, setStep] = useState(0);
    const [directorIdentifier, setDirectorIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [targetUserIdentifier, setTargetUserIdentifier] = useState('');
    const [recoveryToken, setRecoveryToken] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [tokenReceived, setTokenReceived] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const steps = ['Verify Credentials', 'Enter Token', 'Set New PIN'];
    const handleRequestRecovery = async () => {
        if (!directorIdentifier) {
            setError('Please enter your email or phone number');
            return;
        }
        if (!password) {
            setError('Please enter your password');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const response = await apiService.requestPinRecovery(directorIdentifier, password, targetUserIdentifier || undefined);
            if (response.success) {
                setTokenReceived(true);
                // In development, show the token. In production, it would be sent via email/SMS
                if (response.recoveryToken) {
                    setRecoveryToken(response.recoveryToken);
                    setStep(1);
                    alert(`Recovery token generated!\n\nToken: ${response.recoveryToken}\n\n(In production, this would be sent to your email/phone)`);
                }
                else {
                    alert('Recovery token has been sent. Please check your email/phone.');
                    setStep(1);
                }
            }
        }
        catch (err) {
            setError(err.message || 'Failed to request recovery token');
        }
        finally {
            setLoading(false);
        }
    };
    const handleVerifyToken = () => {
        if (!recoveryToken) {
            setError('Please enter the recovery token');
            return;
        }
        setError('');
        setStep(2);
    };
    const handleResetPin = async () => {
        if (!newPin || !confirmPin) {
            setError('Please enter and confirm your new PIN');
            return;
        }
        if (newPin !== confirmPin) {
            setError('PINs do not match');
            return;
        }
        if (!/^\d{4,6}$/.test(newPin)) {
            setError('PIN must be 4-6 digits');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const response = await apiService.verifyPinRecovery(recoveryToken, newPin);
            if (response.success) {
                alert('PIN reset successfully! You can now login with your new PIN.');
                handleClose();
                onSuccess();
            }
        }
        catch (err) {
            setError(err.message || 'Failed to reset PIN');
        }
        finally {
            setLoading(false);
        }
    };
    const handleClose = () => {
        setStep(0);
        setDirectorIdentifier('');
        setPassword('');
        setTargetUserIdentifier('');
        setRecoveryToken('');
        setNewPin('');
        setConfirmPin('');
        setError('');
        setTokenReceived(false);
        setShowPassword(false);
        onClose();
    };
    return (_jsxs(Dialog, { open: open, onClose: handleClose, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(SecurityIcon, { color: "primary" }), _jsx(Typography, { variant: "h6", children: "PIN Recovery" })] }) }), _jsxs(DialogContent, { children: [_jsx(Stepper, { activeStep: step, sx: { mt: 2, mb: 3 }, children: steps.map((label) => (_jsx(Step, { children: _jsx(StepLabel, { children: label }) }, label))) }), error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, children: error })), step === 0 && (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: "Enter your credentials to verify your identity. A recovery token will be generated and expire in 1 hour." }), _jsx(TextField, { fullWidth: true, label: "Email or Phone Number", value: directorIdentifier, onChange: (e) => setDirectorIdentifier(e.target.value), margin: "normal", required: true, disabled: loading, placeholder: "Enter your email or phone" }), _jsx(TextField, { fullWidth: true, label: "Password", type: showPassword ? 'text' : 'password', value: password, onChange: (e) => setPassword(e.target.value), margin: "normal", required: true, disabled: loading, InputProps: {
                                    endAdornment: (_jsx(InputAdornment, { position: "end", children: _jsx(IconButton, { onClick: () => setShowPassword(!showPassword), edge: "end", children: showPassword ? _jsx(VisibilityOff, {}) : _jsx(Visibility, {}) }) })),
                                } }), _jsx(TextField, { fullWidth: true, label: "Target User Email or Phone", value: targetUserIdentifier, onChange: (e) => setTargetUserIdentifier(e.target.value), margin: "normal", required: true, disabled: loading, placeholder: "Enter target user email or phone", helperText: "Enter the email or phone of the user whose PIN you want to reset" })] })), step === 1 && (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: "Enter the recovery token you received. In production, this would be sent to your email/phone." }), _jsx(TextField, { fullWidth: true, label: "Recovery Token", value: recoveryToken, onChange: (e) => setRecoveryToken(e.target.value), margin: "normal", required: true, disabled: loading, placeholder: "Paste your recovery token here" })] })), step === 2 && (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: "Enter your new PIN (4-6 digits). Make sure to remember it!" }), _jsx(TextField, { fullWidth: true, label: "New PIN", type: "password", value: newPin, onChange: (e) => setNewPin(e.target.value), margin: "normal", required: true, disabled: loading, inputProps: { maxLength: 6, pattern: '[0-9]*' }, InputProps: {
                                    startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(LockIcon, {}) })),
                                } }), _jsx(TextField, { fullWidth: true, label: "Confirm New PIN", type: "password", value: confirmPin, onChange: (e) => setConfirmPin(e.target.value), margin: "normal", required: true, disabled: loading, inputProps: { maxLength: 6, pattern: '[0-9]*' }, InputProps: {
                                    startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(LockIcon, {}) })),
                                } })] }))] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleClose, disabled: loading, children: "Cancel" }), step === 0 && (_jsx(Button, { onClick: handleRequestRecovery, variant: "contained", disabled: loading, children: loading ? 'Requesting...' : 'Request Recovery Token' })), step === 1 && (_jsx(Button, { onClick: handleVerifyToken, variant: "contained", disabled: loading || !recoveryToken, children: "Verify Token" })), step === 2 && (_jsx(Button, { onClick: handleResetPin, variant: "contained", disabled: loading || !newPin || !confirmPin, children: loading ? 'Resetting...' : 'Reset PIN' }))] })] }));
}
