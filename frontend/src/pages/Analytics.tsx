import { useState, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import '../App.css'

interface CellData {
    value: string | number | boolean
}

interface RowData {
    [columnKey: string]: CellData
}

function Analytics() {
    // Active tab: 'data' or 'pivot'
    const [activeTab, setActiveTab] = useState<'data' | 'pivot'>('data')

    // Spreadsheet data
    const [columns, setColumns] = useState<string[]>([])
    const [rows, setRows] = useState<RowData[]>([])

    // File upload ref
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Pivot configuration
    const [rowFields, setRowFields] = useState<string[]>([])
    const [columnFields, setColumnFields] = useState<string[]>([])
    const [filterFields, setFilterFields] = useState<string[]>([])
    const [valueField, setValueField] = useState<'count' | 'sum'>('count')
    const [sumColumn, setSumColumn] = useState<string>('')

    // Dragging state
    const [draggedField, setDraggedField] = useState<string | null>(null)
    const [draggedFrom, setDraggedFrom] = useState<'available' | 'row' | 'column' | 'filter' | null>(null)

    // Get available fields (not used in any area)
    const availableFields = useMemo(() => {
        const used = new Set([...rowFields, ...columnFields, ...filterFields])
        return columns.filter(col => !used.has(col))
    }, [columns, rowFields, columnFields, filterFields])

    // Handle Excel file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result
                const workbook = XLSX.read(bstr, { type: 'binary' })
                const worksheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[worksheetName]
                const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

                if (data.length === 0) {
                    alert('File Excel trống hoặc không có dữ liệu.')
                    return
                }

                // First row is headers - handle empty headers
                const rawHeaders = data[0]
                const headers = rawHeaders.map((h, idx) => {
                    const headerStr = String(h || '').trim()
                    return headerStr || `Cột ${idx + 1}`
                })

                // Check for duplicate headers
                const headerSet = new Set<string>()
                const uniqueHeaders = headers.map((h) => {
                    let finalHeader = h
                    let counter = 1
                    while (headerSet.has(finalHeader)) {
                        finalHeader = `${h}_${counter}`
                        counter++
                    }
                    headerSet.add(finalHeader)
                    return finalHeader
                })

                // Get data rows and filter out completely empty rows
                const dataRows = data.slice(1).filter(row => {
                    // Check if row has any non-empty cell
                    return row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
                })

                if (dataRows.length === 0) {
                    alert('File Excel không có dữ liệu (chỉ có header).')
                    return
                }

                // Convert to our format
                const newRows: RowData[] = dataRows.map((row) => {
                    const rowData: RowData = {}
                    uniqueHeaders.forEach((header, idx) => {
                        const cellValue = row[idx]
                        // Handle various data types
                        let value: string | number | boolean = ''
                        if (cellValue !== null && cellValue !== undefined) {
                            if (typeof cellValue === 'boolean') {
                                value = cellValue
                            } else if (typeof cellValue === 'number') {
                                value = cellValue
                            } else {
                                value = String(cellValue)
                            }
                        }
                        rowData[header] = { value }
                    })
                    return rowData
                })

                setColumns(uniqueHeaders)
                setRows(newRows)

                // Show success message
                alert(`Đã import thành công ${newRows.length} dòng và ${uniqueHeaders.length} cột từ file Excel!`)
            } catch (error) {
                console.error('Error reading Excel file:', error)
                alert('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.\n\nChi tiết: ' + (error as Error).message)
            }
        }
        reader.readAsBinaryString(file)

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Initialize empty spreadsheet
    const initializeEmptySpreadsheet = () => {
        const defaultColumns = ['Cột 1', 'Cột 2', 'Cột 3', 'Cột 4', 'Cột 5']
        const defaultRows: RowData[] = Array.from({ length: 10 }, () => {
            const row: RowData = {}
            defaultColumns.forEach(col => {
                row[col] = { value: '' }
            })
            return row
        })
        setColumns(defaultColumns)
        setRows(defaultRows)
    }

    // Add column
    const handleAddColumn = () => {
        const newColName = `Cột ${columns.length + 1}`
        setColumns(prev => [...prev, newColName])
        setRows(prev => prev.map(row => ({
            ...row,
            [newColName]: { value: '' }
        })))
    }

    // Remove column
    const handleRemoveColumn = (colName: string) => {
        setColumns(prev => prev.filter(c => c !== colName))
        setRows(prev => prev.map(row => {
            const newRow = { ...row }
            delete newRow[colName]
            return newRow
        }))
        // Remove from pivot fields if exists
        setRowFields(prev => prev.filter(f => f !== colName))
        setColumnFields(prev => prev.filter(f => f !== colName))
        setFilterFields(prev => prev.filter(f => f !== colName))
    }

    // Rename column
    const handleRenameColumn = (oldName: string, newName: string) => {
        if (!newName.trim() || oldName === newName) return
        if (columns.includes(newName)) {
            alert('Tên cột đã tồn tại!')
            return
        }

        setColumns(prev => prev.map(c => c === oldName ? newName : c))
        setRows(prev => prev.map(row => {
            const newRow: RowData = {}
            Object.keys(row).forEach(key => {
                newRow[key === oldName ? newName : key] = row[key]
            })
            return newRow
        }))

        // Update pivot fields
        setRowFields(prev => prev.map(f => f === oldName ? newName : f))
        setColumnFields(prev => prev.map(f => f === oldName ? newName : f))
        setFilterFields(prev => prev.map(f => f === oldName ? newName : f))
    }

    // Add row
    const handleAddRow = () => {
        const newRow: RowData = {}
        columns.forEach(col => {
            newRow[col] = { value: '' }
        })
        setRows(prev => [...prev, newRow])
    }

    // Remove row
    const handleRemoveRow = (rowIndex: number) => {
        setRows(prev => prev.filter((_, idx) => idx !== rowIndex))
    }

    // Update cell value
    const handleCellChange = (rowIndex: number, colName: string, value: string | number | boolean) => {
        setRows(prev => prev.map((row, idx) => {
            if (idx === rowIndex) {
                return {
                    ...row,
                    [colName]: { value }
                }
            }
            return row
        }))
    }

    // Generate pivot table
    const pivotData = useMemo(() => {
        if (rowFields.length === 0 || columnFields.length === 0 || rows.length === 0) {
            return { columnHeaders: [], rows: [] }
        }

        // Build column headers
        const columnValuesSet = new Set<string>()
        rows.forEach(row => {
            const colKey = columnFields.map(field => String(row[field]?.value ?? '')).join(' | ')
            columnValuesSet.add(colKey)
        })
        const columnHeaders = Array.from(columnValuesSet).sort()

        // Build rows
        const rowValuesMap = new Map<string, Map<string, number>>()

        rows.forEach(row => {
            const rowKey = rowFields.map(field => String(row[field]?.value ?? '')).join(' | ')
            const colKey = columnFields.map(field => String(row[field]?.value ?? '')).join(' | ')

            if (!rowValuesMap.has(rowKey)) {
                rowValuesMap.set(rowKey, new Map())
            }

            const rowMap = rowValuesMap.get(rowKey)!
            const currentValue = rowMap.get(colKey) || 0

            if (valueField === 'count') {
                rowMap.set(colKey, currentValue + 1)
            } else if (valueField === 'sum' && sumColumn) {
                const cellValue = row[sumColumn]?.value
                const numValue = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue)) || 0
                rowMap.set(colKey, currentValue + numValue)
            }
        })

        const pivotRows = Array.from(rowValuesMap.entries()).map(([rowLabel, colValues]) => ({
            rowLabel,
            values: columnHeaders.map(col => colValues.get(col) || 0),
            total: columnHeaders.reduce((sum, col) => sum + (colValues.get(col) || 0), 0)
        }))

        return { columnHeaders, rows: pivotRows }
    }, [rows, rowFields, columnFields, valueField, sumColumn])

    // Drag & Drop handlers
    const handleDragStart = (field: string, from: 'available' | 'row' | 'column' | 'filter') => {
        setDraggedField(field)
        setDraggedFrom(from)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleDrop = (area: 'row' | 'column' | 'filter' | 'available') => {
        if (!draggedField || !draggedFrom) return

        // Remove from source
        if (draggedFrom === 'row') {
            setRowFields(prev => prev.filter(f => f !== draggedField))
        } else if (draggedFrom === 'column') {
            setColumnFields(prev => prev.filter(f => f !== draggedField))
        } else if (draggedFrom === 'filter') {
            setFilterFields(prev => prev.filter(f => f !== draggedField))
        }

        // Add to target
        if (area === 'row' && draggedFrom !== 'row') {
            setRowFields(prev => [...prev, draggedField])
        } else if (area === 'column' && draggedFrom !== 'column') {
            setColumnFields(prev => [...prev, draggedField])
        } else if (area === 'filter' && draggedFrom !== 'filter') {
            setFilterFields(prev => [...prev, draggedField])
        }

        setDraggedField(null)
        setDraggedFrom(null)
    }

    // Export to Excel
    const handleExportToExcel = () => {
        if (columns.length === 0 || rows.length === 0) {
            alert('Không có dữ liệu để xuất!')
            return
        }

        const ws_data = [
            columns,
            ...rows.map(row => columns.map(col => row[col]?.value ?? ''))
        ]

        const ws = XLSX.utils.aoa_to_sheet(ws_data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Data')
        XLSX.writeFile(wb, 'data.xlsx')
    }

    return (
        <div className="analytics-page-wrapper">
            {/* Tab Navigation */}
            <div className="analytics-tabs">
                <button
                    className={`analytics-tab ${activeTab === 'data' ? 'active' : ''}`}
                    onClick={() => setActiveTab('data')}
                >
                    📝 Nhập dữ liệu
                </button>
                <button
                    className={`analytics-tab ${activeTab === 'pivot' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pivot')}
                >
                    📊 Pivot Table
                </button>
            </div>

            {/* Data Input Tab */}
            {activeTab === 'data' && (
                <div className="analytics-data-tab">
                    {columns.length === 0 ? (
                        // Initial state - no data
                        <div className="analytics-empty-state">
                            <div className="empty-state-icon">📊</div>
                            <h2>Chưa có dữ liệu</h2>
                            <p>Bắt đầu bằng cách tạo bảng mới hoặc tải lên file Excel</p>
                            <div className="empty-state-actions">
                                <button
                                    className="btn-primary"
                                    onClick={initializeEmptySpreadsheet}
                                >
                                    📄 Tạo bảng mới
                                </button>
                                <button
                                    className="btn-secondary"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    📁 Tải lên Excel
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>
                    ) : (
                        // Spreadsheet view
                        <>
                            <div className="analytics-data-header">
                                <h2 className="analytics-title">Bảng dữ liệu</h2>
                                <div className="analytics-toolbar">
                                    <button className="btn-secondary-sm" onClick={() => fileInputRef.current?.click()}>
                                        📁 Import Excel
                                    </button>
                                    <button className="btn-secondary-sm" onClick={handleExportToExcel}>
                                        💾 Export Excel
                                    </button>
                                    <button className="btn-secondary-sm" onClick={handleAddColumn}>
                                        ➕ Thêm cột
                                    </button>
                                    <button className="btn-primary-sm" onClick={handleAddRow}>
                                        ➕ Thêm dòng
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileUpload}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            </div>

                            <div className="analytics-spreadsheet-container">
                                <table className="analytics-spreadsheet">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '50px' }}>#</th>
                                            {columns.map((col, idx) => (
                                                <th key={idx}>
                                                    <div className="column-header-content">
                                                        <input
                                                            type="text"
                                                            value={col}
                                                            onChange={(e) => handleRenameColumn(col, e.target.value)}
                                                            onBlur={(e) => {
                                                                if (!e.target.value.trim()) {
                                                                    e.target.value = col
                                                                }
                                                            }}
                                                            className="column-name-input"
                                                        />
                                                        <button
                                                            className="column-delete-btn"
                                                            onClick={() => handleRemoveColumn(col)}
                                                            title="Xóa cột"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </th>
                                            ))}
                                            <th style={{ width: '60px' }}>Xóa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, rowIdx) => (
                                            <tr key={rowIdx}>
                                                <td className="spreadsheet-cell-readonly">{rowIdx + 1}</td>
                                                {columns.map((col) => (
                                                    <td key={col} className="spreadsheet-cell">
                                                        <input
                                                            type="text"
                                                            value={String(row[col]?.value ?? '')}
                                                            onChange={(e) => handleCellChange(rowIdx, col, e.target.value)}
                                                            className="spreadsheet-input"
                                                        />
                                                    </td>
                                                ))}
                                                <td className="spreadsheet-cell-center">
                                                    <button
                                                        onClick={() => handleRemoveRow(rowIdx)}
                                                        className="spreadsheet-delete-btn"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="analytics-data-info">
                                Tổng số dòng: <strong>{rows.length}</strong> | Tổng số cột: <strong>{columns.length}</strong>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Pivot Table Tab */}
            {activeTab === 'pivot' && (
                <div className="analytics-container">
                    {columns.length === 0 ? (
                        <div className="analytics-empty-state">
                            <div className="empty-state-icon">📊</div>
                            <h2>Chưa có dữ liệu</h2>
                            <p>Vui lòng nhập dữ liệu ở tab "Nhập dữ liệu" trước</p>
                            <button
                                className="btn-primary"
                                onClick={() => setActiveTab('data')}
                            >
                                ← Quay lại nhập dữ liệu
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Left Panel - Field List & Configuration */}
                            <div className="analytics-left-panel">
                                <h3 className="analytics-header">
                                    📊 Cấu hình Pivot Table
                                </h3>

                                {/* Value Field Selection */}
                                <div className="analytics-config-section">
                                    <label className="analytics-config-label">
                                        Giá trị hiển thị:
                                    </label>
                                    <select
                                        value={valueField}
                                        onChange={(e) => setValueField(e.target.value as 'count' | 'sum')}
                                        className="analytics-select"
                                    >
                                        <option value="count">Số lượng (COUNT)</option>
                                        <option value="sum">Tổng (SUM)</option>
                                    </select>

                                    {valueField === 'sum' && (
                                        <select
                                            value={sumColumn}
                                            onChange={(e) => setSumColumn(e.target.value)}
                                            className="analytics-select"
                                            style={{ marginTop: '8px' }}
                                        >
                                            <option value="">Chọn cột để tính tổng</option>
                                            {columns.map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Available Fields */}
                                <div className="analytics-config-section">
                                    <label className="analytics-config-label">
                                        Trường có sẵn:
                                    </label>
                                    <div
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop('available')}
                                        className="analytics-field-list"
                                    >
                                        {availableFields.map(field => (
                                            <div
                                                key={field}
                                                draggable
                                                onDragStart={() => handleDragStart(field, 'available')}
                                                className="analytics-field-item"
                                            >
                                                <span>⋮⋮</span>
                                                {field}
                                            </div>
                                        ))}
                                        {availableFields.length === 0 && (
                                            <div className="analytics-field-empty">
                                                Kéo trường về đây để xóa
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="analytics-hint">
                                    💡 Kéo thả các trường vào các vùng bên phải để tạo pivot table
                                </div>
                            </div>

                            {/* Right Panel - Pivot Table Builder */}
                            <div className="analytics-right-panel">
                                <h2 className="analytics-title">
                                    Bảng Pivot Table
                                </h2>

                                {/* Drop Zones Layout - Excel Style */}
                                <div className="analytics-drop-zones">
                                    {/* Filter Area - Top Left */}
                                    <div>
                                        <label className="analytics-drop-zone-label">
                                            Bộ lọc
                                        </label>
                                        <div
                                            onDragOver={handleDragOver}
                                            onDrop={() => handleDrop('filter')}
                                            className={`analytics-drop-zone filter ${filterFields.length === 0 ? 'empty' : ''}`}
                                        >
                                            {filterFields.map(field => (
                                                <div
                                                    key={field}
                                                    draggable
                                                    onDragStart={() => handleDragStart(field, 'filter')}
                                                    className="analytics-field-tag filter"
                                                >
                                                    <span>⋮⋮</span>
                                                    {field}
                                                </div>
                                            ))}
                                            {filterFields.length === 0 && (
                                                <div className="analytics-drop-zone-empty">
                                                    Kéo trường vào đây
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Column Area - Top Right */}
                                    <div>
                                        <label className="analytics-drop-zone-label">
                                            Cột
                                        </label>
                                        <div
                                            onDragOver={handleDragOver}
                                            onDrop={() => handleDrop('column')}
                                            className={`analytics-drop-zone column ${columnFields.length === 0 ? 'empty' : ''}`}
                                        >
                                            {columnFields.map(field => (
                                                <div
                                                    key={field}
                                                    draggable
                                                    onDragStart={() => handleDragStart(field, 'column')}
                                                    className="analytics-field-tag column"
                                                >
                                                    <span>⋮⋮</span>
                                                    {field}
                                                </div>
                                            ))}
                                            {columnFields.length === 0 && (
                                                <div className="analytics-drop-zone-empty">
                                                    Kéo trường vào đây
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Row Area - Bottom Left */}
                                    <div>
                                        <label className="analytics-drop-zone-label">
                                            Hàng
                                        </label>
                                        <div
                                            onDragOver={handleDragOver}
                                            onDrop={() => handleDrop('row')}
                                            className={`analytics-drop-zone row ${rowFields.length === 0 ? 'empty' : ''}`}
                                        >
                                            {rowFields.map(field => (
                                                <div
                                                    key={field}
                                                    draggable
                                                    onDragStart={() => handleDragStart(field, 'row')}
                                                    className="analytics-field-tag row"
                                                >
                                                    <span>⋮⋮</span>
                                                    {field}
                                                </div>
                                            ))}
                                            {rowFields.length === 0 && (
                                                <div className="analytics-drop-zone-empty row">
                                                    Kéo trường vào đây
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Values Area - Bottom Right (Info only) */}
                                    <div>
                                        <label className="analytics-drop-zone-label">
                                            Giá trị
                                        </label>
                                        <div className="analytics-values-area">
                                            <div className="analytics-values-content">
                                                <div className="analytics-values-type">
                                                    {valueField === 'count' ? 'COUNT' : 'SUM'}
                                                </div>
                                                <div className="analytics-values-desc">
                                                    {valueField === 'count' ? 'Đếm số lượng' : `Tổng: ${sumColumn || '(chưa chọn)'}`}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Result Table */}
                                <div className="analytics-result-container">
                                    {pivotData.rows.length === 0 ? (
                                        <div className="analytics-no-data">
                                            <div className="analytics-no-data-icon">📊</div>
                                            <h3>Chưa có dữ liệu pivot</h3>
                                            <p>
                                                Kéo thả các trường vào <strong>Hàng</strong> và <strong>Cột</strong> để tạo bảng pivot
                                            </p>
                                        </div>
                                    ) : (
                                        <table className="analytics-table">
                                            <thead>
                                                <tr>
                                                    <th className="row-header">
                                                        {rowFields.join(' / ')}
                                                    </th>
                                                    {pivotData.columnHeaders.map((header, idx) => (
                                                        <th key={idx} className="column-header">
                                                            {header}
                                                        </th>
                                                    ))}
                                                    <th className="total-header">
                                                        Tổng
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pivotData.rows.map((row, rowIdx) => (
                                                    <tr key={rowIdx}>
                                                        <td className="row-label">
                                                            {row.rowLabel}
                                                        </td>
                                                        {row.values.map((value, colIdx) => (
                                                            <td key={colIdx} className={`value-cell ${value > 0 ? 'has-value' : 'no-value'}`}>
                                                                {value > 0 ? value : '-'}
                                                            </td>
                                                        ))}
                                                        <td className="total-cell">
                                                            {row.total}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="total-row">
                                                    <td className="row-label">
                                                        Tổng cộng
                                                    </td>
                                                    {pivotData.columnHeaders.map((_, colIdx) => {
                                                        const colTotal = pivotData.rows.reduce((sum, row) => sum + row.values[colIdx], 0)
                                                        return (
                                                            <td key={colIdx} className="value-cell">
                                                                {colTotal}
                                                            </td>
                                                        )
                                                    })}
                                                    <td className="grand-total">
                                                        {pivotData.rows.reduce((sum, row) => sum + row.total, 0)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default Analytics
