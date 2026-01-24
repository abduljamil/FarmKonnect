import React from 'react';
import { useParams } from 'react-router-dom';

const TransactionDetails = () => {
    const { id } = useParams();

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Transaction Details</h1>
            <p>Details for transaction ID: {id}</p>
        </div>
    );
};

export default TransactionDetails;
