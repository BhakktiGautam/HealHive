import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from "../Context/AuthContext";
import { storage } from "../firebase";
import { useState, useRef} from "react";


export const MedicalReportUpload  = ({onUploadSuccess}) =>{
    const inputRef = useRef(null);          
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const {user} = useAuth();

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        if(file.type !== "application/pdf"){
            setError("Only PDF files are allowed.");
            return;
        }

        if(file.size > 5 * 1024 * 1024){
            setError(" File Size must be under 5MB ");
            return;
        }

        setError("");
        setSuccessMsg("");
        setUploading(true);

        setProgress(0);

        const storageRef = ref(storage, `medicalReports/${user.uid}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on("state_changed",
            (snapshot) => {
                const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100
                );
                setProgress(pct);
            },
            (err) => {
                setError("Upload failed. Please try again.");
                setUploading(false);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                const report = {
                    id: Date.now(),
                    name: file.name,
                    size: (file.size / 1024).toFixed(1) + "KB",
                    date: new Date().toLocaleDateString(),
                    type: "pdf",
                    url: downloadURL,
                };

                const token = await user.getIdToken();

                await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/patient/documents/add`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        report
                    }),
                });
                onUploadSuccess(report);
                setSuccessMsg("File uploaded successfully!");
                setUploading(false);

                inputRef.current.value = "";
            }
        );
    };

    return (
        <div className="mt-4">
            <input
            type="file"
            accept=".pdf"
            ref={inputRef}
            onChange={handleFileChange}
            className="hidden"
            />

            <button
            onClick={() => inputRef.current.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
            >
            {uploading ? "Uploading..." : "Upload PDF Report"}
            </button>

            {uploading && (
            <div className="mt-3 w-full bg-emerald-100 rounded-full h-2">
                <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
                />
            </div>
            )}

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            {successMsg && <p className="mt-2 text-sm text-emerald-600">{successMsg}</p>}
        </div>
    );

}
