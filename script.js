// ============================================
// Curve Fitter Pro - Enhanced Version
// Features: Multiple Graphs + HTML Export
// ============================================

// Global State
let datasets = []; // Array of {id, name, data, color, fitType, visible}
let currentDatasetId = null;
let chart = null;

// Chart Configuration
const chartConfig = {
    type: 'scatter',
    data: {
        datasets: []
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: '#e0e0e0',
                    font: {
                        family: 'Outfit',
                        size: 12
                    },
                    usePointStyle: true,
                    generateLabels: (chart) => {
                        return datasets.map(ds => ({
                            text: ds.name,
                            fillStyle: ds.color,
                            strokeStyle: ds.color,
                            hidden: !ds.visible,
                            datasetIndex: datasets.findIndex(d => d.id === ds.id)
                        }));
                    }
                },
                onClick: (e, legendItem, legend) => {
                    const index = legendItem.datasetIndex;
                    if (index >= 0 && index < datasets.length) {
                        toggleDatasetVisibility(datasets[index].id);
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(20, 20, 40, 0.9)',
                titleColor: '#fff',
                bodyColor: '#e0e0e0',
                borderColor: 'rgba(74, 144, 226, 0.5)',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                },
                ticks: {
                    color: '#a0a0a0'
                }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                },
                ticks: {
                    color: '#a0a0a0'
                }
            }
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    setupEventListeners();
    createNewDataset();
    updateUI();
});

function initializeChart() {
    const ctx = document.getElementById('curveChart').getContext('2d');
    chart = new Chart(ctx, chartConfig);
}

function setupEventListeners() {
    // Add point
    document.getElementById('addBtn').addEventListener('click', addPoint);
    document.getElementById('inputX').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('inputY').focus();
    });
    document.getElementById('inputY').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPoint();
    });

    // Clear all
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Clear all datasets?')) {
            datasets = [];
            createNewDataset();
            updateChart();
            updateUI();
        }
    });

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportAsHTML);
    }

    // Fit type selector
    document.querySelectorAll('.fit-option').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.fit-option').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const fitType = this.dataset.value;
            if (currentDatasetId) {
                const ds = getDataset(currentDatasetId);
                if (ds) {
                    ds.fitType = fitType;
                    updateChart();
                    updateEquationDisplay();
                }
            }
        });
    });

    // Scale mode
    document.querySelectorAll('input[name="scaleMode"]').forEach(radio => {
        radio.addEventListener('change', updateScaleDisplay);
    });

    // Orientation
    document.querySelectorAll('input[name="orientation"]').forEach(radio => {
        radio.addEventListener('change', updateScaleDisplay);
    });

    // Custom scale inputs
    ['customScaleX', 'customScaleY', 'axisStartX', 'axisStartY'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateScaleDisplay);
    });
}

// ============================================
// Dataset Management
// ============================================

let isAddingDataset = false; // Prevent rapid clicks

function handleAddDataset() {
    if (isAddingDataset) return; // Prevent duplicate calls
    
    isAddingDataset = true;
    createNewDataset();
    updateUI();
    
    // Reset flag after a short delay
    setTimeout(() => {
        isAddingDataset = false;
    }, 300);
}

function createNewDataset() {
    const id = Date.now();
    const color = getNextColor();
    const dataset = {
        id: id,
        name: `Dataset ${datasets.length + 1}`,
        data: [],
        color: color,
        fitType: 'optimal',
        visible: true
    };
    datasets.push(dataset);
    currentDatasetId = id;
    return dataset;
}

function getDataset(id) {
    return datasets.find(ds => ds.id === id);
}

function getCurrentDataset() {
    return getDataset(currentDatasetId);
}

function toggleDatasetVisibility(id) {
    const ds = getDataset(id);
    if (ds) {
        ds.visible = !ds.visible;
        updateChart();
    }
}

function deleteDataset(id) {
    const index = datasets.findIndex(ds => ds.id === id);
    if (index !== -1) {
        datasets.splice(index, 1);
        if (currentDatasetId === id) {
            currentDatasetId = datasets.length > 0 ? datasets[0].id : null;
            if (datasets.length === 0) {
                createNewDataset();
            }
        }
        updateChart();
        updateUI();
    }
}

// ============================================
// Data Point Management
// ============================================

function addPoint() {
    const ds = getCurrentDataset();
    if (!ds) return;

    const x = parseFloat(document.getElementById('inputX').value);
    const y = parseFloat(document.getElementById('inputY').value);

    if (isNaN(x) || isNaN(y)) {
        alert('Please enter valid numbers');
        return;
    }

    ds.data.push({ x, y });
    document.getElementById('inputX').value = '';
    document.getElementById('inputY').value = '';
    document.getElementById('inputX').focus();

    updateChart();
    updateDataTable();
    updateEquationDisplay();
}

function removePoint(datasetId, index) {
    const ds = getDataset(datasetId);
    if (ds) {
        ds.data.splice(index, 1);
        updateChart();
        updateDataTable();
        updateEquationDisplay();
    }
}

// ============================================
// Chart Rendering
// ============================================

function updateChart() {
    if (!chart) return;

    chart.data.datasets = [];

    datasets.forEach(ds => {
        if (!ds.visible || ds.data.length === 0) return;

        // Scatter points
        chart.data.datasets.push({
            label: `${ds.name} (points)`,
            data: ds.data,
            backgroundColor: ds.color,
            borderColor: ds.color,
            pointRadius: 6,
            pointHoverRadius: 8,
            showLine: false
        });

        // Fitted curve
        if (ds.data.length >= 2) {
            const actualFitType = ds.fitType === 'optimal' ? determineBestFit(ds.data) : ds.fitType;
            const fittedData = calculateFittedCurve(ds.data, actualFitType);
            chart.data.datasets.push({
                label: `${ds.name} (fit)`,
                data: fittedData,
                borderColor: ds.color,
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4,
                showLine: true
            });
        }
    });

    chart.update();
}

// ============================================
// Curve Fitting
// ============================================

function determineBestFit(data) {
    const types = ['linear', 'exponential', 'logarithmic', 'saturation'];
    let bestType = 'linear';
    let bestR2 = -Infinity;

    types.forEach(type => {
        const r2 = calculateR2(data, type);
        if (r2 > bestR2) {
            bestR2 = r2;
            bestType = type;
        }
    });

    return bestType;
}

function calculateFittedCurve(data, fitType) {
    if (data.length < 2) return [];

    const sortedData = [...data].sort((a, b) => a.x - b.x);
    const xMin = Math.min(...data.map(p => p.x));
    const xMax = Math.max(...data.map(p => p.x));
    const points = 100;
    const step = (xMax - xMin) / points;

    const fitted = [];
    for (let i = 0; i <= points; i++) {
        const x = xMin + i * step;
        const y = predictY(x, data, fitType);
        if (isFinite(y)) {
            fitted.push({ x, y });
        }
    }

    return fitted;
}

function predictY(x, data, fitType) {
    const params = calculateFitParameters(data, fitType);
    
    switch (fitType) {
        case 'linear':
            return params.a * x + params.b;
        case 'exponential':
            return params.a * Math.exp(params.b * x);
        case 'logarithmic':
            return params.a * Math.log(x) + params.b;
        case 'saturation':
            return params.a * (1 - Math.exp(-params.b * x));
        default:
            return 0;
    }
}

function calculateFitParameters(data, fitType) {
    const n = data.length;
    
    switch (fitType) {
        case 'linear': {
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            data.forEach(p => {
                sumX += p.x;
                sumY += p.y;
                sumXY += p.x * p.y;
                sumX2 += p.x * p.x;
            });
            const a = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const b = (sumY - a * sumX) / n;
            return { a, b };
        }
        case 'exponential': {
            const logData = data.filter(p => p.y > 0).map(p => ({ x: p.x, y: Math.log(p.y) }));
            if (logData.length < 2) return { a: 1, b: 0 };
            const linear = calculateFitParameters(logData, 'linear');
            return { a: Math.exp(linear.b), b: linear.a };
        }
        case 'logarithmic': {
            const logData = data.filter(p => p.x > 0).map(p => ({ x: Math.log(p.x), y: p.y }));
            if (logData.length < 2) return { a: 1, b: 0 };
            const linear = calculateFitParameters(logData, 'linear');
            return { a: linear.a, b: linear.b };
        }
        case 'saturation': {
            const maxY = Math.max(...data.map(p => p.y));
            const a = maxY * 1.1;
            let b = 0.1;
            
            for (let iter = 0; iter < 100; iter++) {
                let sumNum = 0, sumDen = 0;
                data.forEach(p => {
                    const exp = Math.exp(-b * p.x);
                    const pred = a * (1 - exp);
                    sumNum += p.x * (p.y - pred) * exp;
                    sumDen += p.x * p.x * exp * exp;
                });
                if (sumDen !== 0) {
                    b += sumNum / sumDen * 0.1;
                }
            }
            
            return { a, b };
        }
        default:
            return { a: 1, b: 0 };
    }
}

function calculateR2(data, fitType) {
    if (data.length < 2) return 0;

    const yMean = data.reduce((sum, p) => sum + p.y, 0) / data.length;
    let ssRes = 0, ssTot = 0;

    data.forEach(p => {
        const yPred = predictY(p.x, data, fitType);
        if (isFinite(yPred)) {
            ssRes += Math.pow(p.y - yPred, 2);
            ssTot += Math.pow(p.y - yMean, 2);
        }
    });

    return ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
}

// ============================================
// UI Updates
// ============================================

function updateUI() {
    updateDatasetList();
    updateDataTable();
    updateEquationDisplay();
    updateScaleDisplay();
}

function updateDatasetList() {
    const sidebar = document.querySelector('.sidebar');
    
    // Remove existing dataset list if present
    const existingList = sidebar.querySelector('.dataset-management');
    if (existingList) {
        existingList.remove();
    }

    // Create new dataset list
    const container = document.createElement('div');
    container.className = 'control-group dataset-management';
    container.innerHTML = `
        <h3>Datasets</h3>
        <div class="dataset-list" id="datasetList"></div>
        <button id="addDatasetBtn" class="btn-secondary">➕ Add Dataset</button>
    `;

    // Insert before fitting method section
    const fitSection = sidebar.querySelector('.control-group');
    sidebar.insertBefore(container, fitSection);

    // Populate dataset list
    const list = document.getElementById('datasetList');
    datasets.forEach(ds => {
        const item = document.createElement('div');
        item.className = 'dataset-item';
        if (ds.id === currentDatasetId) item.classList.add('active');
        
        item.innerHTML = `
            <div class="dataset-color" style="background-color: ${ds.color}"></div>
            <input type="text" class="dataset-name" value="${ds.name}" data-id="${ds.id}">
            <button class="dataset-visibility" data-id="${ds.id}">${ds.visible ? '👁️' : '👁️‍🗨️'}</button>
            ${datasets.length > 1 ? `<button class="dataset-delete" data-id="${ds.id}">🗑️</button>` : ''}
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('dataset-name') && 
                !e.target.classList.contains('dataset-visibility') &&
                !e.target.classList.contains('dataset-delete')) {
                currentDatasetId = ds.id;
                updateUI();
                updateFitSelector();
            }
        });

        list.appendChild(item);
    });

    // Add event listeners
    document.getElementById('addDatasetBtn')?.addEventListener('click', handleAddDataset);
    
    document.querySelectorAll('.dataset-name').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            const ds = getDataset(id);
            if (ds) {
                ds.name = e.target.value;
                updateChart();
            }
        });
    });

    document.querySelectorAll('.dataset-visibility').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(e.target.dataset.id);
            toggleDatasetVisibility(id);
            updateUI();
        });
    });

    document.querySelectorAll('.dataset-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(e.target.dataset.id);
            if (confirm('Delete this dataset?')) {
                deleteDataset(id);
            }
        });
    });
}

function updateFitSelector() {
    const ds = getCurrentDataset();
    if (ds) {
        document.querySelectorAll('.fit-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === ds.fitType);
        });
    }
}

function updateDataTable() {
    const tbody = document.getElementById('dataBody');
    tbody.innerHTML = '';

    const ds = getCurrentDataset();
    if (!ds) return;

    ds.data.forEach((point, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${point.x.toFixed(2)}</td>
            <td>${point.y.toFixed(2)}</td>
            <td><button class="btn-delete" onclick="removePoint(${ds.id}, ${index})">×</button></td>
        `;
    });
}

function updateEquationDisplay() {
    const ds = getCurrentDataset();
    if (!ds || ds.data.length < 2) {
        document.getElementById('equationDisplay').textContent = 'y = ...';
        document.getElementById('r2Display').textContent = '0.000';
        return;
    }

    const actualFitType = ds.fitType === 'optimal' ? determineBestFit(ds.data) : ds.fitType;
    const params = calculateFitParameters(ds.data, actualFitType);
    const r2 = calculateR2(ds.data, actualFitType);

    let equation = '';
    switch (actualFitType) {
        case 'linear':
            equation = `y = ${params.a.toFixed(3)}x + ${params.b.toFixed(3)}`;
            break;
        case 'exponential':
            equation = `y = ${params.a.toFixed(3)}e^(${params.b.toFixed(3)}x)`;
            break;
        case 'logarithmic':
            equation = `y = ${params.a.toFixed(3)}ln(x) + ${params.b.toFixed(3)}`;
            break;
        case 'saturation':
            equation = `y = ${params.a.toFixed(3)}(1 - e^(-${params.b.toFixed(3)}x))`;
            break;
    }

    document.getElementById('equationDisplay').textContent = equation;
    document.getElementById('r2Display').textContent = r2.toFixed(3);
}

function updateScaleDisplay() {
    const scaleMode = document.querySelector('input[name="scaleMode"]:checked').value;
    const customSection = document.getElementById('customScaleSection');
    const autoSection = document.getElementById('autoScaleSection');
    const orientation = document.querySelector('input[name="orientation"]:checked').value;

    if (scaleMode === 'custom') {
        customSection.style.display = 'block';
        autoSection.style.display = 'none';
    } else {
        customSection.style.display = 'none';
        autoSection.style.display = 'block';
        calculateAutoScale();
    }

    // Update selected orientation styling
    document.getElementById('scaleLandscapeContainer').dataset.selected = orientation === 'landscape';
    document.getElementById('scalePortraitContainer').dataset.selected = orientation === 'portrait';
}

function calculateAutoScale() {
    const allData = datasets.flatMap(ds => ds.data);
    if (allData.length === 0) {
        document.getElementById('scaleLandscape').textContent = '--';
        document.getElementById('scalePortrait').textContent = '--';
        return;
    }

    const xValues = allData.map(p => p.x);
    const yValues = allData.map(p => p.y);
    const xRange = Math.max(...xValues) - Math.min(...xValues);
    const yRange = Math.max(...yValues) - Math.min(...yValues);

    // A4 dimensions in cm
    const landscapeX = 26, landscapeY = 16;
    const portraitX = 16, portraitY = 26;

    const scaleXLandscape = (xRange / landscapeX).toFixed(2);
    const scaleYLandscape = (yRange / landscapeY).toFixed(2);
    const scaleXPortrait = (xRange / portraitX).toFixed(2);
    const scaleYPortrait = (yRange / portraitY).toFixed(2);

    document.getElementById('scaleLandscape').textContent = `X: ${scaleXLandscape} units/cm | Y: ${scaleYLandscape} units/cm`;
    document.getElementById('scalePortrait').textContent = `X: ${scaleXPortrait} units/cm | Y: ${scaleYPortrait} units/cm`;
}

// ============================================
// Color Management
// ============================================

function getNextColor() {
    const colors = [
        '#4A90E2', '#E24A90', '#90E24A', '#E2904A',
        '#4AE290', '#904AE2', '#E2E24A', '#4A4AE2',
        '#E24A4A', '#4AE2E2'
    ];
    return colors[datasets.length % colors.length];
}

// ============================================
// HTML Export Functionality
// ============================================

function exportAsHTML() {
    const html = generateStandaloneHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curve-fitter-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
}

function generateStandaloneHTML() {
    const state = {
        datasets: datasets.map(ds => ({
            ...ds,
            // Pre-calculate fitted curves for export
            fittedCurve: ds.data.length >= 2 ? calculateFittedCurveForExport(ds.data, ds.fitType) : null
        })),
        currentDatasetId: currentDatasetId
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Curve Fitter Pro - Exported Graph</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Outfit', sans-serif;
            background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #4A90E2;
        }
        .chart-container {
            flex: 1;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            padding: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        canvas {
            max-height: 80vh;
        }
        .info {
            margin-top: 20px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }
        .dataset-info {
            padding: 15px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            border-left: 4px solid;
        }
        .dataset-info h3 {
            margin-bottom: 8px;
            font-size: 1.1rem;
        }
        .dataset-info p {
            margin: 5px 0;
            font-size: 0.9rem;
            color: #b0b0b0;
        }
        .stat {
            color: #4A90E2;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Curve Fitter Pro - Interactive Graph</h1>
        <p>Exported on ${new Date().toLocaleString()}</p>
    </div>
    <div class="chart-container">
        <canvas id="chart"></canvas>
    </div>
    <div class="info" id="info"></div>

    <script>
        const state = ${JSON.stringify(state)};
        
        // Initialize chart
        const ctx = document.getElementById('chart').getContext('2d');
        const chartDatasets = [];
        
        state.datasets.forEach(ds => {
            if (!ds.visible) return;
            
            // Only add if there's data
            if (ds.data.length > 0) {
                // Points
                chartDatasets.push({
                    label: ds.name + ' (points)',
                    data: ds.data,
                    backgroundColor: ds.color,
                    borderColor: ds.color,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    showLine: false
                });
            }
            
            // Fitted curve
            if (ds.fittedCurve && ds.fittedCurve.length > 0) {
                chartDatasets.push({
                    label: ds.name + ' (fit)',
                    data: ds.fittedCurve,
                    borderColor: ds.color,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    showLine: true
                });
            }
        });
        
        new Chart(ctx, {
            type: 'scatter',
            data: { datasets: chartDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { 
                            color: '#e0e0e0',
                            font: {
                                family: 'Outfit',
                                size: 12
                            },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(20, 20, 40, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#e0e0e0',
                        borderColor: 'rgba(74, 144, 226, 0.5)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#a0a0a0' }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#a0a0a0' }
                    }
                }
            }
        });
        
        // Display dataset info
        const info = document.getElementById('info');
        state.datasets.forEach(ds => {
            if (!ds.visible) return;
            
            const div = document.createElement('div');
            div.className = 'dataset-info';
            div.style.borderLeftColor = ds.color;
            
            const fitTypeLabel = ds.fitType === 'optimal' ? 'Optimal (Auto)' : 
                                 ds.fitType.charAt(0).toUpperCase() + ds.fitType.slice(1);
            
            div.innerHTML = \`
                <h3>\${ds.name}</h3>
                <p>Data Points: <span class="stat">\${ds.data.length}</span></p>
                <p>Fitting Method: <span class="stat">\${fitTypeLabel}</span></p>
                <p>Color: <span class="stat" style="color: \${ds.color}">\${ds.color}</span></p>
            \`;
            info.appendChild(div);
        });
    </script>
</body>
</html>`;
}

function calculateFittedCurveForExport(data, fitType) {
    // Use the same calculation as the main display
    if (data.length < 2) return null;
    
    const actualFitType = fitType === 'optimal' ? determineBestFit(data) : fitType;
    return calculateFittedCurve(data, actualFitType);
}
