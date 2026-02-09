/**
 * 物性曲線圖表
 * @module components/overlay/PropertyChart
 */

import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { PropertyData } from '../../types/geology';

interface PropertyChartProps {
    properties: PropertyData[];
}

export function PropertyChart({ properties }: PropertyChartProps) {
    if (properties.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                無物性資料
            </div>
        );
    }

    // 準備資料
    const depths = properties.map((p) => p.depth);
    const nValues = properties.map((p) => p.nValue ?? null);
    const rqds = properties.map((p) => p.rqd ?? null);

    const option: EChartsOption = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' },
        },
        legend: {
            data: ['N值', 'RQD (%)'],
            bottom: 0,
        },
        grid: {
            left: '10%',
            right: '10%',
            top: '10%',
            bottom: '15%',
        },
        xAxis: [
            {
                type: 'value',
                name: 'N值',
                position: 'top',
                axisLine: { lineStyle: { color: '#5470c6' } },
                min: 0,
                max: 60,
            },
            {
                type: 'value',
                name: 'RQD (%)',
                position: 'top',
                offset: 30,
                axisLine: { lineStyle: { color: '#91cc75' } },
                min: 0,
                max: 100,
            },
        ],
        yAxis: {
            type: 'value',
            name: '深度 (m)',
            inverse: true, // 深度向下
            min: 0,
        },
        series: [
            {
                name: 'N值',
                type: 'line',
                xAxisIndex: 0,
                data: nValues.map((v, i) => [v, depths[i]]),
                smooth: true,
                lineStyle: { width: 2 },
                symbol: 'circle',
                symbolSize: 6,
            },
            {
                name: 'RQD (%)',
                type: 'line',
                xAxisIndex: 1,
                data: rqds.map((v, i) => [v, depths[i]]),
                smooth: true,
                lineStyle: { width: 2 },
                symbol: 'diamond',
                symbolSize: 6,
            },
        ],
    };

    return (
        <div>
            <ReactECharts
                option={option}
                style={{ height: '300px' }}
                opts={{ renderer: 'svg' }}
            />

            {/* 資料表格 */}
            <div style={{ marginTop: '16px', overflowX: 'auto' }}>
                <table
                    style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                    }}
                >
                    <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                            <th style={thStyle}>深度 (m)</th>
                            <th style={thStyle}>N值</th>
                            <th style={thStyle}>RQD (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {properties.slice(0, 10).map((prop, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={tdStyle}>{prop.depth.toFixed(1)}</td>
                                <td style={tdStyle}>{prop.nValue ?? '-'}</td>
                                <td style={tdStyle}>{prop.rqd?.toFixed(1) ?? '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '8px',
    textAlign: 'center',
    fontWeight: 600,
    color: '#333',
    borderBottom: '2px solid #ddd',
};

const tdStyle: React.CSSProperties = {
    padding: '8px',
    textAlign: 'center',
    color: '#555',
};

export default PropertyChart;
