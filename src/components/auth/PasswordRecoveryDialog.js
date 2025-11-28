import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Alert, Box, Stepper, Step, StepLabel, InputAdornment, IconButton, } from '@mui/material';
import { Security as SecurityIcon, Lock as LockIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { apiService } from '../../services/apiService';
export default function PasswordRecoveryDialog({ open, onClose, onSuccess }) {
    const [step, setStep] = useState(0);
    const [identifier, setIdentifier] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [recoveryToken, setRecoveryToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const steps = ['Verify Identity', 'Enter Token', 'Set New Password'];
    const handleRequestRecovery = async () => {
        if (!identifier) {
            setError('Please enter your email or phone number');
            return;
        }
        if (!twoFactorCode) {
            setError('Please enter your 2FA code from your authenticator app');
            return;
        }
        if (!/^\d{6}$/.test(twoFactorCode)) {
            setError('2FA code must be 6 digits');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const response = await apiService.requestPasswordRecovery(identifier, twoFactorCode);
            if (response.success) {
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
    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            setError('Please enter and confirm your new password');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const response = await apiService.verifyPasswordRecovery(recoveryToken, newPassword);
            if (response.success) {
                alert('Password reset successfully! You can now login with your new password.');
                handleClose();
                onSuccess();
            }
        }
        catch (err) {
            setError(err.message || 'Failed to reset password');
        }
        finally {
            setLoading(false);
        }
    };
    const handleClose = () => {
        setStep(0);
        setIdentifier('');
        setTwoFactorCode('');
        setRecoveryToken('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setShowPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        onClose();
    };
    return (_jsxs(Dialog, { open: open, onClose: handleClose, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(SecurityIcon, { color: "primary" }), _jsx(Typography, { variant: "h6", children: "Password Recovery" })] }) }), _jsxs(DialogContent, { children: [_jsx(Stepper, { activeStep: step, sx: { mt: 2, mb: 3 }, children: steps.map((label) => (_jsx(Step, { children: _jsx(StepLabel, { children: label }) }, label))) }), error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, children: error })), step === 0 && (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: "Enter your email or phone number and 2FA code from your authenticator app. A recovery token will be generated and expire in 1 hour." }), _jsx(TextField, { fullWidth: true, label: "Email or Phone Number", value: identifier, onChange: (e) => setIdentifier(e.target.value), margin: "normal", required: true, disabled: loading, placeholder: "Enter your email or phone" }), _jsx(TextField, { fullWidth: true, label: "2FA Code", value: twoFactorCode, onChange: (e) => setTwoFactorCode(e.target.value), margin: "normal", required: true, disabled: loading, inputProps: { maxLength: 6, pattern: '[0-9]*' }, helperText: "Enter 6-digit code from your authenticator app" })] })), step === 1 && (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: "Enter the recovery token you received. In production, this would be sent to your email/phone." }), _jsx(TextField, { fullWidth: true, label: "Recovery Token", value: recoveryToken, onChange: (e) => setRecoveryToken(e.target.value), margin: "normal", required: true, disabled: loading, placeholder: "Paste your recovery token here" })] })), step === 2 && (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: "Enter your new password (minimum 6 characters). Make sure to remember it!" }), _jsx(TextField, { fullWidth: true, label: "New Password", type: showNewPassword ? 'text' : 'password', value: newPassword, onChange: (e) => setNewPassword(e.target.value), margin: "normal", required: true, disabled: loading, InputProps: {
                                    startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(LockIcon, {}) })),
                                    endAdornment: (_jsx(InputAdornment, { position: "end", children: _jsx(IconButton, { onClick: () => setShowNewPassword(!showNewPassword), edge: "end", size: "small", children: showNewPassword ? _jsx(VisibilityOff, {}) : _jsx(Visibility, {}) }) })),
                                } }), _jsx(TextField, { fullWidth: true, label: "Confirm New Password", type: showConfirmPassword ? 'text' : 'password', value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), margin: "normal", required: true, disabled: loading, InputProps: {
                                    startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(LockIcon, {}) })),
                                    endAdornment: (_jsx(InputAdornment, { position: "end", children: _jsx(IconButton, { onClick: () => setShowConfirmPassword(!showConfirmPassword), edge: "end", size: "small", children: showConfirmPassword ? _jsx(VisibilityOff, {}) : _jsx(Visibility, {}) }) })),
                                } })] }))] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleClose, disabled: loading, children: "Cancel" }), step === 0 && (_jsx(Button, { onClick: handleRequestRecovery, variant: "contained", disabled: loading || !identifier || !twoFactorCode, children: loading ? 'Requesting...' : 'Request Recovery Token' })), step === 1 && (_jsx(Button, { onClick: handleVerifyToken, variant: "contained", disabled: loading || !recoveryToken, children: "Verify Token" })), step === 2 && (_jsx(Button, { onClick: handleResetPassword, variant: "contained", disabled: loading || !newPassword || !confirmPassword, children: loading ? 'Resetting...' : 'Reset Password' }))] })] }));
}
