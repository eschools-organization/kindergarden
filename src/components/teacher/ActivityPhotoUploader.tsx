"use client";
import React, { useState, useEffect } from "react";
import {
  IoCameraOutline,
  IoCloudUploadOutline,
  IoTrashOutline,
  IoImageOutline,
  IoSparklesOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoTimeOutline
} from "react-icons/io5";

const CameraIcon = IoCameraOutline as React.FC<{ size?: number | string; className?: string }>;
const UploadIcon = IoCloudUploadOutline as React.FC<{ size?: number | string; className?: string }>;
const TrashIcon = IoTrashOutline as React.FC<{ size?: number | string; className?: string }>;
const ImageIcon = IoImageOutline as React.FC<{ size?: number | string; className?: string }>;
const SparklesIcon = IoSparklesOutline as React.FC<{ size?: number | string; className?: string }>;
const CheckmarkIcon = IoCheckmarkCircleOutline as React.FC<{ size?: number | string; className?: string }>;
const CloseIcon = IoCloseCircleOutline as React.FC<{ size?: number | string; className?: string }>;
const TimeIcon = IoTimeOutline as React.FC<{ size?: number | string; className?: string }>;

interface ClassObj {
  _id: string;
  classname: string;
}

interface ActivityPhoto {
  _id: string;
  class_id: string;
  teacher_id?: string;
  teacher_name?: string;
  activity_title: string;
  description?: string;
  photo_url: string;
  date: string;
  created_at?: string;
}

interface ActivityPhotoUploaderProps {
  groups: ClassObj[];
  initialGroupId?: string;
  currentTeacherId?: string;
  currentTeacherName?: string;
  showToast?: (msg: string, type: 'success' | 'error') => void;
}

const PRESET_ACTIVITIES = [
  "🎨 ხატვა და ძერწვა",
  "🎵 მუსიკა და ცეკვა",
  "📖 ზღაპრის კითხვა",
  "🌳 ეზოში სეირნობა და თამაში",
  "🧩 განვითარებითი თამაშები",
  "🤸‍♂️ დილის ვარჯიში",
  "🍱 სადილობა / კვება",
  "🎉 სადღესასწაულო ღონისძიება",
];

export default function ActivityPhotoUploader({
  groups,
  initialGroupId = "",
  currentTeacherId = "",
  currentTeacherName = "აღმზრდელი",
  showToast
}: ActivityPhotoUploaderProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroupId || (groups[0]?._id || ""));
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [activityTitle, setActivityTitle] = useState<string>("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [description, setDescription] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const [photosList, setPhotosList] = useState<ActivityPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);
  const [activeLightbox, setActiveLightbox] = useState<ActivityPhoto | null>(null);

  useEffect(() => {
    if (initialGroupId) setSelectedGroup(initialGroupId);
    else if (groups.length > 0 && !selectedGroup) setSelectedGroup(groups[0]._id);
  }, [initialGroupId, groups]);

  // Fetch photos for selected group & date
  const fetchPhotos = async () => {
    if (!selectedGroup) return;
    setLoadingPhotos(true);
    try {
      const res = await fetch(`/api/activity-photos?class_id=${selectedGroup}&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setPhotosList(data);
      }
    } catch {
      // silent
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [selectedGroup, selectedDate]);

  const togglePresetActivity = (preset: string) => {
    setSelectedActivities((prev) => {
      let next: string[];
      if (prev.includes(preset)) {
        next = prev.filter((p) => p !== preset);
      } else {
        next = [...prev, preset];
      }
      setActivityTitle(next.join(", "));
      return next;
    });
  };

  const handleSelectAllActivities = () => {
    setSelectedActivities([...PRESET_ACTIVITIES]);
    setActivityTitle(PRESET_ACTIVITIES.join(", "));
  };

  const handleClearActivities = () => {
    setSelectedActivities([]);
    setActivityTitle("");
  };

  const handleTitleChange = (val: string) => {
    setActivityTitle(val);
    const matched = PRESET_ACTIVITIES.filter((p) => val.includes(p));
    setSelectedActivities(matched);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUploadAndPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) {
      if (showToast) showToast("გთხოვთ აირჩიოთ ჯგუფი", "error");
      return;
    }
    if (!selectedFile) {
      if (showToast) showToast("გთხოვთ აირჩიოთ ფოტო ატვირთვისთვის", "error");
      return;
    }

    setUploading(true);
    try {
      // Step 1: Upload photo file via /api/file-upload
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch("/api/file-upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.error || "ფაილის ატვირთვა ვერ მოხერხდა");
      }

      const uploadData = await uploadRes.json();
      const photoUrl = uploadData.file_url;

      const finalTitle = activityTitle.trim() || (selectedActivities.length > 0 ? selectedActivities.join(", ") : "შესრულებული აქტივობა");

      // Step 2: Save activity photo record via /api/activity-photos
      const saveRes = await fetch("/api/activity-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: selectedGroup,
          teacher_id: currentTeacherId,
          teacher_name: currentTeacherName,
          activity_title: finalTitle,
          activities: selectedActivities.length > 0 ? selectedActivities : [finalTitle],
          description: description.trim(),
          photo_url: photoUrl,
          date: selectedDate,
        }),
      });

      if (saveRes.ok) {
        if (showToast) showToast("აქტივობის ფოტო წარმატებით აიტვირთა!", "success");
        // Reset form
        setSelectedFile(null);
        setPreviewUrl(null);
        setSelectedActivities([]);
        setActivityTitle("");
        setDescription("");
        // Refresh photos list
        fetchPhotos();
      } else {
        const errData = await saveRes.json();
        throw new Error(errData.message || "შენახვა ვერ მოხერხდა");
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || "შეცდომა ატვირთვისას", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("ნამდვილად გსურთ ამ ფოტოს წაშლა?")) return;
    try {
      const res = await fetch(`/api/activity-photos?id=${photoId}`, { method: "DELETE" });
      if (res.ok) {
        if (showToast) showToast("ფოტო წაიშალა", "success");
        setPhotosList(prev => prev.filter(p => p._id !== photoId));
      } else {
        if (showToast) showToast("წაშლა ვერ მოხერხდა", "error");
      }
    } catch {
      if (showToast) showToast("შეცდომა წაშლისას", "error");
    }
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Upload Form Card */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          border: "1px solid #e2e8f0",
          padding: "28px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #bfdbfe",
              }}
            >
              <CameraIcon size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#0f172a" }}>
                📸 შესრულებული აქტივობის ფოტოს ატვირთვა
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#64748b", fontWeight: 600 }}>
                დააფიქსირეთ ბაღში შესრულებული აქტივობა ფოტოსურათით
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUploadAndPublish} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Selectors Bar */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 800, color: "#334155", marginBottom: "6px" }}>
                აირჩიეთ ჯგუფი:
              </label>
              <select
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 700,
                  fontSize: "14px",
                  outline: "none",
                }}
              >
                <option value="">-- აირჩიეთ ჯგუფი --</option>
                {groups.map(g => (
                  <option key={g._id} value={g._id}>
                    {g.classname} (ჯგუფი)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: "1 1 180px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 800, color: "#334155", marginBottom: "6px" }}>
                თარიღი:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 700,
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Activity Title Preset Chips & Input */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 800, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🎯 აქტივობის დასახელება & მონიშვნა:</span>
                {selectedActivities.length > 0 && (
                  <span style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    background: "#2563eb",
                    color: "#ffffff",
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}>
                    {selectedActivities.length} მონიშნული
                  </span>
                )}
              </label>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={handleSelectAllActivities}
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  ყველას მონიშვნა
                </button>
                {selectedActivities.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearActivities}
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#dc2626",
                      cursor: "pointer",
                    }}
                  >
                    გასუფთავება
                  </button>
                )}
              </div>
            </div>

            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 8px 0" }}>
              დააჭირეთ სასურველ აქტივობებს (შეგიძლიათ მონიშნოთ რამოდენიმე ერთდროულად):
            </p>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
              {PRESET_ACTIVITIES.map(preset => {
                const isSelected = selectedActivities.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => togglePresetActivity(preset)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "20px",
                      border: isSelected ? "1px solid #2563eb" : "1px solid #cbd5e1",
                      background: isSelected ? "#2563eb" : "#f8fafc",
                      color: isSelected ? "#ffffff" : "#334155",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.25)" : "none",
                      transform: isSelected ? "scale(1.02)" : "scale(1)",
                    }}
                  >
                    <span style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "4px",
                      border: isSelected ? "1px solid #ffffff" : "1px solid #94a3b8",
                      background: isSelected ? "#ffffff" : "transparent",
                      color: "#2563eb",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: 900,
                    }}>
                      {isSelected ? "✓" : ""}
                    </span>
                    {preset}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              placeholder="მაგ: ხატვის გაკვეთილი / შემოდგომის აპლიკაციები (შეგიძლიათ ჩაწეროთ დამატებით)"
              value={activityTitle}
              onChange={e => handleTitleChange(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>

          {/* Optional Description */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 800, color: "#334155", marginBottom: "6px" }}>
              აღწერა / კომენტარი (არასავალდებულო):
            </label>
            <textarea
              rows={2}
              placeholder="მოკლედ აღწერეთ რა გააკეთეს ბავშვებმა..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontWeight: 600,
                fontSize: "14px",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          {/* File Selector & Preview */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <label
              style={{
                padding: "12px 20px",
                borderRadius: "14px",
                border: "2px dashed #3b82f6",
                background: "#eff6ff",
                color: "#2563eb",
                fontWeight: 800,
                fontSize: "14px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
            >
              <UploadIcon size={20} />
              {selectedFile ? "📷 ფოტოს შეცვლა" : "📷 აირჩიეთ ფოტო"}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>

            {selectedFile && (
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                არჩეულია: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            )}
          </div>

          {/* Photo Preview Box */}
          {previewUrl && (
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "320px",
                height: "200px",
                borderRadius: "16px",
                overflow: "hidden",
                border: "2px solid #bfdbfe",
                boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
              }}
            >
              <img
                src={previewUrl}
                alt="Preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  background: "rgba(239, 68, 68, 0.9)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Submit Button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              style={{
                padding: "12px 28px",
                borderRadius: "14px",
                border: "none",
                background: uploading ? "#94a3b8" : "#2563eb",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "15px",
                cursor: uploading || !selectedFile ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                transition: "all 0.2s ease",
              }}
            >
              <CameraIcon size={20} />
              {uploading ? "იტვირთება..." : "ფოტოს დაფიქსირება & გამოქვეყნება"}
            </button>
          </div>
        </form>
      </div>

      {/* Gallery Section */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          border: "1px solid #e2e8f0",
          padding: "28px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ImageIcon size={22} className="text-blue-600" />
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#0f172a" }}>
              🖼️ შესრულებული აქტივობების ფოტოგალერეა ({photosList.length})
            </h3>
          </div>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#64748b" }}>
            თარიღი: <strong>{selectedDate}</strong>
          </span>
        </div>

        {loadingPhotos ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b", fontWeight: 700 }}>
            ფოტოები იტვირთება...
          </div>
        ) : photosList.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              background: "#f8fafc",
              borderRadius: "16px",
              border: "1px dashed #cbd5e1",
              color: "#64748b",
            }}
          >
            <p style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
              ამ თარიღისთვის არ არის ატვირთული აქტივობის ფოტოები.
            </p>
            <p style={{ margin: "6px 0 0 0", fontSize: "13px" }}>
              ზემოთ ფორმიდან აირჩიეთ ფოტო და დააჭირეთ „ფოტოს დაფიქსირება“.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "20px",
            }}
          >
            {photosList.map(item => (
              <div
                key={item._id}
                style={{
                  background: "#ffffff",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  cursor: "pointer",
                }}
                onClick={() => setActiveLightbox(item)}
              >
                <div style={{ position: "relative", width: "100%", height: "180px", background: "#f1f5f9" }}>
                  <img
                    src={item.photo_url}
                    alt={item.activity_title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      bottom: "8px",
                      right: "8px",
                      background: "rgba(15, 23, 42, 0.75)",
                      backdropFilter: "blur(4px)",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "4px 8px",
                      borderRadius: "8px",
                    }}
                  >
                    {item.date}
                  </span>
                </div>

                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {item.activity_title.split(/•|,/).map((act, i) => (
                      <span
                        key={i}
                        style={{
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          border: "1px solid #bfdbfe",
                          padding: "3px 8px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: 800,
                        }}
                      >
                        {act.trim()}
                      </span>
                    ))}
                  </div>
                  {item.description && (
                    <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.4" }}>
                      {item.description}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700 }}>
                      👤 {item.teacher_name}
                    </span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeletePhoto(item._id);
                      }}
                      style={{
                        background: "#fef2f2",
                        border: "1px solid #fee2e2",
                        color: "#ef4444",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <TrashIcon size={14} /> წაშლა
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Lightbox Modal */}
      {activeLightbox && (
        <div
          onClick={() => setActiveLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              maxWidth: "800px",
              width: "100%",
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ position: "relative", width: "100%", maxHeight: "70vh", background: "#0f172a" }}>
              <img
                src={activeLightbox.photo_url}
                alt={activeLightbox.activity_title}
                style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", display: "block", margin: "0 auto" }}
              />
              <button
                onClick={() => setActiveLightbox(null)}
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  background: "rgba(0,0,0,0.6)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  fontSize: "18px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                {activeLightbox.activity_title.split(/•|,/).map((act, i) => (
                  <span
                    key={i}
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      padding: "4px 12px",
                      borderRadius: "14px",
                      fontSize: "13px",
                      fontWeight: 800,
                    }}
                  >
                    {act.trim()}
                  </span>
                ))}
              </div>
              {activeLightbox.description && (
                <div style={{ fontSize: "14px", color: "#334155", marginBottom: "12px" }}>
                  {activeLightbox.description}
                </div>
              )}
              <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "#64748b", fontWeight: 700 }}>
                <span>📅 {activeLightbox.date}</span>
                <span>👤 {activeLightbox.teacher_name}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
