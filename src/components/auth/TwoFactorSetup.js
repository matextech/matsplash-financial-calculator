import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, TextField, Alert, Stepper, Step, StepLabel, Paper, Divider, IconButton, } from '@mui/material';
import { ContentCopy as CopyIcon, CheckCircle as CheckIcon, Security as SecurityIcon, } from '@mui/icons-material';
import { twoFactorService } from '../../services/twoFactorService';
import { apiService } from '../../services/apiService';
import { authService } from '../../services/authService';
export default function TwoFactorSetup({ open, onClose, onSuccess, userId, userEmail, userName, }) {
    const [activeStep, setActiveStep] = useState(0);
    const [setup, setSetup] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (open && activeStep === 0) {
            generateSetup();
        }
    }, [open, activeStep]);
    const generateSetup = async () => {
        try {
            setLoading(true);
            setError('');
            const twoFactorSetup = await twoFactorService.generateSecret(userId, userEmail || userName, 'MatSplash');
            setSetup(twoFactorSetup);
        }
        catch (err) {
            console.error('Error generating 2FA setup:', err);
            setError('Failed to generate 2FA setup. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    const handleCopySecret = async () => {
        if (setup) {
            try {
                await navigator.clipboard.writeText(setup.manualEntryKey);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
            catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };
    const handleVerify = async () => {
        if (!setup || !verificationCode) {
            setError('Please enter the verification code');
            return;
        }
        if (verificationCode.length !== 6) {
            setError('Verification code must be 6 digits');
            return;
        }
        try {
            setLoading(true);
            setError('');
            // Verify the code locally first
            const isValid = twoFactorService.verifyCode(setup.secret, verificationCode);
            if (!isValid) {
                setError('Invalid verification code. Please try again.');
                setLoading(false);
                return;
            }
            // If valid, save to backend
            const result = await apiService.enable2FA(userId, setup.secret);
            if (result.success) {
                setActiveStep(2);
                // Update local session if current user
                const session = authService.getCurrentSession();
                if (session && session.userId === userId) {
                    // Session will be updated on next login
                }
            }
            else {
                setError(result.message || 'Failed to enable 2FA');
            }
        }
        catch (err) {
            console.error('Error verifying 2FA:', err);
            setError(err.message || 'Failed to verify code. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    const handleClose = () => {
        setActiveStep(0);
        setVerificationCode('');
        setError('');
        setSetup(null);
        setCopied(false);
        onClose();
    };
    const steps = ['Scan QR Code', 'Verify Code', 'Complete'];
    return (_jsxs(Dialog, { open: open, onClose: handleClose, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(SecurityIcon, { color: "primary" }), _jsx(Typography, { variant: "h6", children: "Enable Two-Factor Authentication" })] }) }), _jsxs(DialogContent, { children: [_jsx(Stepper, { activeStep: activeStep, sx: { mt: 2, mb: 3 }, children: steps.map((label) => (_jsx(Step, { children: _jsx(StepLabel, { children: label }) }, label))) }), error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, onClose: () => setError(''), children: error })), activeStep === 0 && (_jsxs(Box, { children: [_jsx(Alert, { severity: "info", sx: { mb: 3 }, children: "Scan the QR code below with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)" }), loading ? (_jsx(Box, { sx: { textAlign: 'center', py: 4 }, children: _jsx(Typography, { children: "Generating QR code..." }) })) : setup ? (_jsxs(Box, { sx: { textAlign: 'center' }, children: [_jsx(Paper, { elevation: 3, sx: {
                                            p: 2,
                                            display: 'inline-block',
                                            bgcolor: 'white',
                                            borderRadius: 2,
                                            mb: 2,
                                        }, children: _jsx("img", { src: setup.qrCodeDataUrl, alt: "2FA QR Code", style: { width: '250px', height: '250px' } }) }), _jsx(Divider, { sx: { my: 2 }, children: "OR" }), _jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Can't scan? Enter this code manually:" }), _jsxs(Box, { sx: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 1,
                                            mt: 1,
                                            mb: 2,
                                        }, children: [_jsx(Paper, { elevation: 1, sx: {
                                                    p: 1.5,
                                                    fontFamily: 'monospace',
                                                    fontSize: '1.1rem',
                                                    letterSpacing: '0.1em',
                                                    bgcolor: 'grey.100',
                                                }, children: twoFactorService.formatSecretForDisplay(setup.manualEntryKey) }), _jsx(IconButton, { onClick: handleCopySecret, color: copied ? 'success' : 'default', size: "small", children: copied ? _jsx(CheckIcon, {}) : _jsx(CopyIcon, {}) })] }), _jsx(Button, { variant: "contained", onClick: () => setActiveStep(1), sx: { mt: 2 }, children: "I've Scanned the Code" })] })) : (_jsxs(Box, { sx: { textAlign: 'center', py: 4 }, children: [_jsx(Typography, { color: "error", children: "Failed to generate setup" }), _jsx(Button, { onClick: generateSetup, sx: { mt: 2 }, children: "Retry" })] }))] })), activeStep === 1 && (_jsxs(Box, { children: [_jsx(Alert, { severity: "warning", sx: { mb: 3 }, children: "Enter the 6-digit code from your authenticator app to verify and enable 2FA." }), _jsx(TextField, { fullWidth: true, label: "Verification Code", value: verificationCode, onChange: (e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                    setVerificationCode(value);
                                    setError('');
                                }, inputProps: {
                                    maxLength: 6,
                                    pattern: '[0-9]*',
                                    inputMode: 'numeric',
                                }, placeholder: "000000", helperText: "Enter the 6-digit code from your authenticator app", sx: { mb: 2 } }), _jsxs(Box, { sx: { display: 'flex', gap: 2, justifyContent: 'flex-end' }, children: [_jsx(Button, { onClick: () => setActiveStep(0), children: "Back" }), _jsx(Button, { variant: "contained", onClick: handleVerify, disabled: loading || verificationCode.length !== 6, children: loading ? 'Verifying...' : 'Verify & Enable' })] })] })), activeStep === 2 && (_jsxs(Box, { sx: { textAlign: 'center', py: 4 }, children: [_jsx(CheckIcon, { color: "success", sx: { fontSize: 64, mb: 2 } }), _jsx(Typography, { variant: "h6", gutterBottom: true, children: "2FA Successfully Enabled!" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "Two-factor authentication is now active for your account. You'll need to enter a code from your authenticator app each time you log in." }), _jsx(Button, { variant: "contained", onClick: onSuccess, children: "Done" })] }))] }), _jsx(DialogActions, { children: activeStep < 2 && (_jsx(Button, { onClick: handleClose, children: "Cancel" })) })] }));
}
