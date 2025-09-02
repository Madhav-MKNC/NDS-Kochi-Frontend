export const formatRecords = (records: any[]) => {
    const headers = ["Date", "Address", "Mobile", "Status", "Assigned Bhagat", "Remarks"];
    const rows = records.map(r => [
        r.date ? new Date(r.date).toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric"
        }) : "N/A",
        r.address,
        r.mobile_no,
        r.status,
        r.assigned_bhagat_name,
        r.remarks || "N/A"
    ]);
    return { headers, rows };
};
