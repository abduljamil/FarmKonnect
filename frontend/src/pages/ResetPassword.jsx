import React from 'react';
import { useParams } from 'react-router-dom';

const ResetPassword = () => {
    const { token } = useParams();

    return (
        <div className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
            <p>Resetting password for token: {token}</p>
        </div>
    );
};

export default ResetPassword;
