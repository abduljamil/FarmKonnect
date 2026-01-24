import React from 'react';
import { useParams } from 'react-router-dom';

const VerifyEmail = () => {
    const { token } = useParams();

    return (
        <div className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Verify Email</h1>
            <p>Verifying token: {token}</p>
        </div>
    );
};

export default VerifyEmail;
