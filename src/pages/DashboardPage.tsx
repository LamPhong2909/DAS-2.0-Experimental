import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock data, to be replaced by API calls
const experimentData = [
  { name: 'Exp A', successful: 40, failed: 24, pending: 10 },
  { name: 'Exp B', successful: 30, failed: 13, pending: 20 },
  { name: 'Exp C', successful: 20, failed: 98, pending: 5 },
  { name: 'Exp D', successful: 27, failed: 39, pending: 15 },
  { name: 'Exp E', successful: 18, failed: 48, pending: 25 },
];

const damData = [
    { name: 'Week 1', images: 12000 },
    { name: 'Week 2', images: 19000 },
    { name: 'Week 3', images: 8000 },
    { name: 'Week 4', images: 25000 },
];

function DashboardPage() {
  return (
    <div>
      <h2>System Overview</h2>
      <p style={{marginBottom: '2rem'}}>High-level view of the DAS ecosystem status.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', height: '300px' }}>
        <div>
            <h3>EAPP Experiment Status</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={experimentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#e0e0e0" />
                    <YAxis stroke="#e0e0e0" />
                    <Tooltip contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #333' }} />
                    <Legend />
                    <Bar dataKey="successful" stackId="a" fill="#82ca9d" />
                    <Bar dataKey="failed" stackId="a" fill="#ca8282" />
                    <Bar dataKey="pending" stackId="a" fill="#8884d8" />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <div>
            <h3>DAM Weekly Acquired Images</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={damData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#e0e0e0" />
                    <YAxis stroke="#e0e0e0" />
                    <Tooltip contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #333' }} />
                    <Legend />
                    <Bar dataKey="images" fill="#6A5ACD" />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
