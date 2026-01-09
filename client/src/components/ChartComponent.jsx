import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

export const ChartComponent = (props) => {
    const {
        data,
        tick,
        colors: {
            backgroundColor = 'transparent',
            lineColor = '#2962FF',
            textColor = 'white',
        } = {},
    } = props;

    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const seriesRef = useRef(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        console.log("CHART: Mounting...");

        // Basic Chart Creation
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width: chartContainerRef.current.clientWidth || 600,
            height: 450,
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
            }
        });
        chartRef.current = chart;

        // In v4, addAreaSeries is the standard way.
        // We will try it. If it fails, we catch it.
        try {
            const newSeries = chart.addAreaSeries({
                lineColor,
                topColor: lineColor,
                bottomColor: 'rgba(41,98,255,0)'
            });
            seriesRef.current = newSeries;

            if (data && data.length > 0) {
                newSeries.setData(data);
                chart.timeScale().fitContent();
            }
        } catch (e) {
            console.error("CHART: Failed to add series", e);
        }

        const handleResize = () => {
            if (chartRef.current)
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
            }
        };
    }, []);

    useEffect(() => {
        if (tick && seriesRef.current) {
            try {
                // Ensure time is unique/valid
                const updateData = {
                    time: tick.time,
                    value: tick.close || tick.value || tick.price
                };
                seriesRef.current.update(updateData);
            } catch (err) {
                console.warn("Update error ignored:", err);
            }
        }
    }, [tick]);

    return (
        <div
            ref={chartContainerRef}
            style={{ width: '100%', height: '100%', position: 'relative' }}
        />
    );
};
