import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDataDisplay = ({ modelId }) => {
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const response = await axios.get('https://api.synthflow.ai/v2/calls', {
          headers: {
            accept: 'text/plain',
            Authorization: 'Bearer 1741798049693x839210709547221000',
          },
        });

        if (
          response.data.status === 'ok' &&
          response.data.response &&
          response.data.response.calls
        ) {
          // Filter the calls based on the admin's modelId.
          const filteredCalls = response.data.response.calls.filter(
            (call) => call.model_id === modelId
          );
          setCalls(filteredCalls);
        }
      } catch (error) {
        console.error('Error fetching calls:', error);
      }
    };

    fetchCalls();
  }, [modelId]);

  return (
    <div>
      <h2>Synthflow API Data</h2>
      {calls.length ? (
        <ul>
          {calls.map((call) => (
            <li key={call.call_id}>
              Caller: {call.phone_number_from} | Time:{' '}
              {new Date(call.start_time).toLocaleString()}
            </li>
          ))}
        </ul>
      ) : (
        <p>No calls found for your model ID.</p>
      )}
    </div>
  );
};

export default AdminDataDisplay;
