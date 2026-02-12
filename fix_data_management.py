import sys

file_path = "/Users/allen/Desktop/LLRWD DigitalTwin Platform/src/pages/DataManagementPage.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 0-based indices
# line 529 is index 528: "    return (\n"
start_index = 529  # We want to insert AFTER line 529 
                   # index 528 is "return (", so we keeping up to items[528].
                   # split is at 529. lines[:529] gives 0...528. Correct.

# End index
# line 915 in view_file (1-based) is index 914.
# We want to keep from line 916 (view_file) -> index 915.
# So lines[915:]
end_skip_index = 915

print(f"Index 528 (last kept): {lines[528]}") 
print(f"Index 529 (first skip): {lines[529]}")
print(f"Index 914 (last skip type): {lines[914]}")
print(f"Index 915 (first kept type): {lines[915]}")

new_css = """        <div className="data-management-page">
            <style>{`
                /* Global Variables & Reset */
                :root {
                    --primary: #2563eb;
                    --primary-hover: #1d4ed8;
                    --danger: #dc2626;
                    --danger-hover: #b91c1c;
                    --success: #16a34a;
                    --gray-50: #f9fafb;
                    --gray-100: #f3f4f6;
                    --gray-200: #e5e7eb;
                    --gray-300: #d1d5db;
                    --gray-400: #9ca3af;
                    --gray-500: #6b7280;
                    --gray-600: #4b5563;
                    --gray-700: #374151;
                    --gray-800: #1f2937;
                    --gray-900: #111827;
                }

                .data-management-page {
                    min-height: 100vh;
                    background: #f8fafc;
                    color: var(--gray-800);
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                }

                /* Header */
                .dm-header {
                    background: white;
                    border-bottom: 1px solid var(--gray-200);
                    padding: 16px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: sticky;
                    top: 0;
                    z-index: 50;
                }

                .dm-header-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .dm-back-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    background: var(--gray-100);
                    border: 1px solid transparent;
                    border-radius: 6px;
                    color: var(--gray-600);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    text-decoration: none;
                    transition: all 0.2s;
                }

                .dm-back-btn:hover {
                    background: var(--gray-200);
                    color: var(--gray-900);
                }

                .dm-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: var(--gray-900);
                    letter-spacing: -0.025em;
                }

                .dm-content {
                    padding: 32px 24px;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                /* Sections */
                .dm-section {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    margin-bottom: 24px;
                    border: 1px solid var(--gray-200);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }

                .dm-section-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .dm-section-icon {
                    width: 40px;
                    height: 40px;
                    background: var(--gray-50);
                    border: 1px solid var(--gray-200);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--gray-600);
                }

                .dm-section-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--gray-900);
                    margin-bottom: 4px;
                }

                .dm-section-desc {
                    font-size: 14px;
                    color: var(--gray-500);
                }

                /* Buttons */
                .dm-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    line-height: 1.25rem;
                }

                .dm-btn-primary {
                    background: var(--primary);
                    color: white;
                    border: 1px solid transparent;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }
                .dm-btn-primary:hover { background: var(--primary-hover); }
                .dm-btn-primary:disabled { background: var(--gray-400); cursor: not-allowed; }

                .dm-btn-secondary {
                    background: white;
                    color: var(--gray-700);
                    border: 1px solid var(--gray-300);
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }
                .dm-btn-secondary:hover { background: var(--gray-50); border-color: var(--gray-400); }

                .dm-btn-danger {
                    background: #fee2e2;
                    color: var(--danger);
                    border: 1px solid #fecaca;
                }
                .dm-btn-danger:hover { background: #fecaca; }

                .dm-btn-danger-solid {
                    background: var(--danger);
                    color: white;
                    border: 1px solid transparent;
                }
                .dm-btn-danger-solid:hover { background: var(--danger-hover); }

                /* Upload Zone */
                .dm-upload-zone {
                    border: 2px dashed var(--gray-300);
                    border-radius: 8px;
                    padding: 32px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: var(--gray-50);
                }
                .dm-upload-zone:hover, .dm-upload-zone.dragging {
                    border-color: var(--primary);
                    background: #eff6ff;
                }
                .dm-upload-icon {
                    color: var(--gray-400);
                    margin-bottom: 12px;
                }
                .dm-upload-text {
                    font-weight: 500;
                    color: var(--gray-700);
                    margin-bottom: 4px;
                }
                .dm-upload-hint {
                    font-size: 12px;
                    color: var(--gray-500);
                }

                /* Modals */
                .dm-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .dm-modal {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    width: 100%;
                    max-width: 500px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid var(--gray-200);
                }
                .dm-modal-header {
                    padding: 16px 24px;
                    border-bottom: 1px solid var(--gray-200);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .dm-modal-title { font-weight: 600; font-size: 16px; color: var(--gray-900); }
                .dm-modal-body { padding: 24px; overflow-y: auto; }
                .dm-modal-footer {
                    padding: 16px 24px;
                    background: var(--gray-50);
                    border-top: 1px solid var(--gray-200);
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                /* Forms */
                .dm-form-group { margin-bottom: 16px; }
                .dm-form-label {
                    display: block;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--gray-700);
                    margin-bottom: 4px;
                }
                .dm-form-input {
                    display: block;
                    width: 100%;
                    padding: 8px 12px;
                    background: white;
                    border: 1px solid var(--gray-300);
                    border-radius: 6px;
                    font-size: 14px;
                    color: var(--gray-900);
                    transition: all 0.15s;
                    box-sizing: border-box;
                }
                .dm-form-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }
                .dm-form-error {
                    font-size: 12px;
                    color: var(--danger);
                    margin-top: 4px;
                }

                /* Cards & Grids */
                .dm-file-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 16px;
                }
                .dm-file-card {
                    background: white;
                    border: 1px solid var(--gray-200);
                    border-radius: 8px;
                    overflow: hidden;
                    transition: all 0.2s;
                    position: relative;
                }
                .dm-file-card:hover {
                    border-color: var(--gray-300);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    transform: translateY(-1px);
                }
                .dm-file-thumb {
                    width: 100%;
                    height: 140px;
                    object-fit: cover;
                    background: var(--gray-100);
                }
                .dm-file-info { padding: 12px; }
                .dm-file-name {
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--gray-900);
                    margin-bottom: 4px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .dm-file-meta {
                    font-size: 12px;
                    color: var(--gray-500);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                /* Tables */
                .dm-table-wrapper {
                    border: 1px solid var(--gray-200);
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                .dm-table { width: 100%; border-collapse: collapse; font-size: 14px; }
                .dm-table th {
                    background: var(--gray-50);
                    padding: 12px 16px;
                    text-align: left;
                    font-weight: 600;
                    color: var(--gray-600);
                    border-bottom: 1px solid var(--gray-200);
                    white-space: nowrap;
                }
                .dm-table td {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--gray-200);
                    color: var(--gray-700);
                }
                .dm-table tr:last-child td { border-bottom: none; }
                .dm-table tr:hover { background: var(--gray-50); }

                /* Misc */
                .dm-empty-state {
                    text-align: center;
                    padding: 40px;
                    background: var(--gray-50);
                    border: 1px dashed var(--gray-300);
                    border-radius: 8px;
                }
                .dm-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 2px 8px;
                    border-radius: 9999px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .dm-badge-blue { background: #dbeafe; color: #1e40af; }
                .dm-badge-green { background: #dcfce7; color: #15803d; }
                .dm-badge-gray { background: #f3f4f6; color: #374151; }
                
                @keyframes progress-shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .dm-progress-container {
                    width: 100%;
                    height: 4px;
                    background: #f1f5f9;
                    border-radius: 2px;
                    overflow: hidden;
                    margin-top: 10px;
                }
                .dm-progress-bar {
                    height: 100%;
                    background: #3b82f6;
                    border-radius: 2px;
                    transition: width 0.3s ease-out;
                }
                .dm-progress-shimmer {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0) 0%,
                        rgba(255, 255, 255, 0.4) 50%,
                        rgba(255, 255, 255, 0) 100%
                    );
                    animation: progress-shimmer 1.5s infinite linear;
                }
            `}</style>
"""

final_content_list = lines[:start_index] + [new_css] + lines[end_skip_index:]

cleaned_content_list = []
for line in final_content_list:
    if "@keyframes dm - toast -in" in line:
        line = line.replace("@keyframes dm - toast -in", "@keyframes dm-toast-in")
    cleaned_content_list.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(cleaned_content_list)
