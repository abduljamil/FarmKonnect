import React from 'react';
import { useParams } from 'react-router-dom';

const CreateTransaction = () => {
    const { listingId } = useParams();

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Create Transaction</h1>
            <p>Buying listing ID: {listingId}</p>
        </div>
    );
};

export default CreateTransaction;
