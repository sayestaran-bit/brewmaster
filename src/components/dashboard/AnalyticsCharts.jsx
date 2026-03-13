import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label, unit = '%' }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                <p className="text-sm font-black text-white">
                    {payload[0].value}{unit}
                </p>
            </div>
        );
    }
    return null;
};

export const EfficiencyChart = ({ data }) => (
    <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="#f59e0b" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorEff)" 
                    animationDuration={1500}
                />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

export const CostBarChart = ({ data }) => (
    <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip content={<CustomTooltip unit=" /L" />} />
                <Bar dataKey="avgCost" radius={[6, 6, 0, 0]} animationDuration={1200}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3b82f6'} fillOpacity={0.8} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
);

export const StylePieChart = ({ data }) => {
    const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];
    
    return (
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        animationDuration={1000}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip unit=" L" />} />
                    <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        formatter={(value) => <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
