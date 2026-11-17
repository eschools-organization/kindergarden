"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  IoCalendarOutline,
  IoTimeOutline,
  IoAddCircleOutline,
  IoTrashOutline,
  IoPencilOutline,
  IoCameraOutline,
  IoCloudUploadOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoSparklesOutline,
  IoArrowBackOutline,
  IoArrowForwardOutline,
  IoEyeOutline,
  IoImageOutline
} from "react-icons/io5";

interface RoutineItem {
  _id?: string;
  class_id: string;
  date?: string;
  time_start: string;
  time_end: string;
  title: string;
  description?: string;
  icon?: string;
  day_of_week?: number;
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

interface GroupDailyScheduleAndPhotosProps {
  classId: string;
  classNameStr: string;
  currentTeacherId?: string;
  currentTeacherName?: string;
  isMethodist?: boolean;
  selectedColor?: string;
  onViewAllGrades?: () => void;
  showToast?: (msg: string, type: "success" | "error") => void;
}

const GEORGIAN_DAYS = [
  "კვირა",
  "ორშაბათი",
  "სამშაბათი",
  "ოთხშაბათი",
  "ხუთშაბათი",
  "პარასკევი",
  "შაბათი",
];

const GEORGIAN_MONTHS = [
  "იანვარი",
  "თებერვალი",
  "მარტი",
  "აპრილი",
  "მაისი",
  "ივნისი",
  "ივლისი",
  "აგვისტო",
  "სექტემბერი",
  "ოქტომბერი",
  "ნოემბერი",
  "დეკემბერი",
];

const QUICK_EMOJIS = ["🌟", "🌅", "🍳", "📚", "🎨", "🎵", "⚽", "🍲", "😴", "🍎", "🧩", "📖", "🧸", "🧼", "🤸‍♂️"];

export default function GroupDailyScheduleAndPhotos({
  classId,
  classNameStr,
  currentTeacherId = "",
  currentTeacherName = "აღმზრდელი",
  isMethodist = false,
  selectedColor = "#2563eb",
  onViewAllGrades,
  showToast,
}: GroupDailyScheduleAndPhotosProps) {
  // Current selected date (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Active sub-tab: "schedule" | "photos"
  const [activeSubTab, setActiveSubTab] = useState<"schedule" | "photos">("schedule");

  // Routine schedule state
  const [routineItems, setRoutineItems] = useState<RoutineItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(false);

  // New routine item form state (manual keyboard entry)
  const [timeStart, setTimeStart] = useState<string>("09:00");
  const [timeEnd, setTimeEnd] = useState<string>("09:45");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [icon, setIcon] = useState<string>("🌟");
  const [savingItem, setSavingItem] = useState<boolean>(false);

  // Edit routine item state
  const [editingItem, setEditingItem] = useState<RoutineItem | null>(null);

  // Photos state
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);

  // Upload photo form state (manual keyboard entry for title & desc)
  const [photoActivityTitle, setPhotoActivityTitle] = useState<string>("");
  const [photoDescription, setPhotoDescription] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Lightbox modal state
  const [activeLightbox, setActiveLightbox] = useState<ActivityPhoto | null>(null);

  // Format date in Georgian for display
  const formatGeorgianDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const dayName = GEORGIAN_DAYS[d.getDay()];
      const dayNum = d.getDate();
      const monthName = GEORGIAN_MONTHS[d.getMonth()];
      const year = d.getFullYear();
      return `${dayName}, ${dayNum} ${monthName} ${year}`;
    } catch {
      return dateStr;
    }
  };

  // Date step helper (prev/next day)
  const changeDateBy = (offsetDays: number) => {
    try {
      const parts = selectedDate.split("-");
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + offsetDays);
      const newStr = d.toISOString().slice(0, 10);
      setSelectedDate(newStr);
    } catch {
      // ignore
    }
  };

  // Fetch group routine items for this class & date
  const fetchSchedule = async () => {
    if (!classId) return;
    setLoadingSchedule(true);
    try {
      const res = await fetch(`/api/class/group-routine?class_id=${classId}&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setRoutineItems(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Fetch activity photos for this class & date
  const fetchPhotos = async () => {
    if (!classId) return;
    setLoadingPhotos(true);
    try {
      const res = await fetch(`/api/activity-photos?class_id=${classId}&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    fetchPhotos();
  }, [classId, selectedDate]);

  // Handle adding new routine item manually
  const handleAddRoutineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      if (showToast) showToast("გთხოვთ შეიყვანოთ აქტივობის დასახელება კლავიატურით", "error");
      return;
    }
    setSavingItem(true);
    try {
      const res = await fetch("/api/class/group-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: classId,
          date: selectedDate,
          time_start: timeStart,
          time_end: timeEnd,
          title: title.trim(),
          description: description.trim(),
          icon: icon || "🌟",
          day_of_week: 0
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (showToast) showToast("აქტივობა წარმატებით დაემატა განრიგში!", "success");
        setTitle("");
        setDescription("");
        // Auto increment next start time
        setTimeStart(timeEnd);
        // Estimate end time +30m
        const [h, m] = timeEnd.split(":").map(Number);
        const endTotal = h * 60 + m + 45;
        const nextEndH = Math.min(23, Math.floor(endTotal / 60));
        const nextEndM = endTotal % 60;
        setTimeEnd(`${String(nextEndH).padStart(2, "0")}:${String(nextEndM).padStart(2, "0")}`);
        fetchSchedule();
      } else {
        if (showToast) showToast(data.message || "შეცდომა აქტივობის დამატებისას", "error");
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || "შეცდომა მოხდა", "error");
    } finally {
      setSavingItem(false);
    }
  };

  // Handle updating existing routine item
  const handleUpdateRoutineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem._id) return;
    setSavingItem(true);
    try {
      const res = await fetch("/api/class/group-routine", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: editingItem._id,
          class_id: classId,
          date: editingItem.date || selectedDate,
          time_start: editingItem.time_start,
          time_end: editingItem.time_end,
          title: editingItem.title.trim(),
          description: (editingItem.description || "").trim(),
          icon: editingItem.icon || "🌟",
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (showToast) showToast("აქტივობა განახლდა!", "success");
        setEditingItem(null);
        fetchSchedule();
      } else {
        if (showToast) showToast(data.message || "შეცდომა განახლებისას", "error");
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || "შეცდომა მოხდა", "error");
    } finally {
      setSavingItem(false);
    }
  };

  // Delete routine item
  const handleDeleteRoutineItem = async (id?: string) => {
    if (!id) return;
    if (!window.confirm("დარწმუნებული ხართ, რომ გსურთ ამ აქტივობის წაშლა?")) return;
    try {
      const res = await fetch(`/api/class/group-routine?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        if (showToast) showToast("აქტივობა წაიშალა", "success");
        fetchSchedule();
      } else {
        const data = await res.json();
        if (showToast) showToast(data.message || "წაშლა ვერ მოხერხდა", "error");
      }
    } catch {
      if (showToast) showToast("შეცდომა წაშლისას", "error");
    }
  };

  // Seed default 9 kindergarten routine activities for this date
  const handleSeedDefaultRoutine = async () => {
    if (!window.confirm(`გსურთ ${selectedDate} თარიღისთვის საბავშვო ბაღის ნაგულისხმევი 9 აქტივობის ჩატვირთვა? (შემდეგ შეგეძლებათ თითოეულის კლავიატურით რედაქტირება)`)) return;
    setLoadingSchedule(true);
    try {
      const res = await fetch("/api/class/group-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "seed_default",
          class_id: classId,
          date: selectedDate
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (showToast) showToast("ნაგულისხმევი განრიგი ჩაიტვირთა ამ თარიღისთვის!", "success");
        fetchSchedule();
      } else {
        if (showToast) showToast(data.message || "ჩატვირთვა ვერ მოხერხდა", "error");
      }
    } catch {
      if (showToast) showToast("შეცდომა ჩატვირთვისას", "error");
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Image compression client-side
  const readAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const rawDataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          try {
            const compressWithParams = (maxDim: number, quality: number) => {
              let width = img.width;
              let height = img.height;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (!ctx) return rawDataUrl;
              ctx.drawImage(img, 0, 0, width, height);
              return canvas.toDataURL("image/jpeg", quality);
            };

            let compressed = compressWithParams(900, 0.75);
            if (compressed.length > 450_000) {
              compressed = compressWithParams(720, 0.6);
            }
            if (compressed.length > 450_000) {
              compressed = compressWithParams(560, 0.5);
            }
            resolve(compressed);
          } catch {
            resolve(rawDataUrl);
          }
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
      };
      reader.onerror = () => reject(new Error("ფოტოს წაკითხვა ვერ მოხერხდა"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      try {
        const dataUrl = await readAndCompressImage(file);
        setPreviewUrl(dataUrl);
      } catch {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  // Handle uploading activity photo
  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !previewUrl) {
      if (showToast) showToast("გთხოვთ აირჩიოთ ფოტო ასატვირთად", "error");
      return;
    }
    const finalTitle = photoActivityTitle.trim() || "შესრულებული აქტივობა";

    setUploadingPhoto(true);
    try {
      let compressedDataUrl = previewUrl;
      if (selectedFile && (!compressedDataUrl || compressedDataUrl.startsWith("blob:") || compressedDataUrl.length > 450_000)) {
        compressedDataUrl = await readAndCompressImage(selectedFile);
      }

      const res = await fetch("/api/activity-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: classId,
          teacher_id: currentTeacherId,
          teacher_name: currentTeacherName,
          activity_title: finalTitle,
          activities: [finalTitle],
          description: photoDescription.trim(),
          photo_url: compressedDataUrl,
          date: selectedDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (showToast) showToast("აქტივობის ფოტო წარმატებით აიტვირთა!", "success");
        setSelectedFile(null);
        setPreviewUrl(null);
        setPhotoActivityTitle("");
        setPhotoDescription("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        fetchPhotos();
      } else {
        if (showToast) showToast(data.message || "ატვირთვა ვერ მოხერხდა", "error");
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || "შეცდომა ატვირთვისას", "error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Delete activity photo
  const handleDeletePhoto = async (photoId: string) => {
    if (!photoId) return;
    if (!window.confirm("დარწმუნებული ხართ, რომ გსურთ ამ ფოტოს წაშლა?")) return;
    try {
      const res = await fetch(`/api/activity-photos?id=${photoId}`, { method: "DELETE" });
      if (res.ok) {
        if (showToast) showToast("ფოტო წაიშალა", "success");
        setPhotos(prev => prev.filter(p => p._id !== photoId));
      } else {
        if (showToast) showToast("ფოტოს წაშლა ვერ მოხერხდა", "error");
      }
    } catch {
      if (showToast) showToast("შეცდომა წაშლისას", "error");
    }
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Group Banner Card */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          padding: "24px 28px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 25px rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "18px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "22px",
              flexShrink: 0,
              boxShadow: "0 8px 20px rgba(37, 99, 235, 0.3)"
            }}
          >
            {classNameStr}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>
                {classNameStr} ჯგუფი
              </h2>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: "20px",
                  background: isMethodist ? "#ede9fe" : "#eff6ff",
                  color: isMethodist ? "#7c3aed" : "#2563eb",
                  border: isMethodist ? "1px solid #ddd6fe" : "1px solid #bfdbfe"
                }}
              >
                {isMethodist ? "📋 მეთოდისტის პანელი" : "⭐ ჯგუფის მართვა"}
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b", fontWeight: 500 }}>
              დღის განრიგის მექანიკური შეტანა და აქტივობის ფოტოები თარიღის მიხედვით
            </p>
          </div>
        </div>

        {onViewAllGrades && (
          <button
            onClick={onViewAllGrades}
            style={{
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              padding: "12px 22px",
              borderRadius: "14px",
              fontWeight: 800,
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s"
            }}
          >
            📊 ჯგუფის სრული ჟურნალი
          </button>
        )}
      </div>

      {/* Date Navigation Bar & View Switcher */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "18px 24px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        {/* Date Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#0f172a", fontWeight: 800, fontSize: "15px" }}>
            <IoCalendarOutline size={22} color="#2563eb" />
            <span>თარიღი:</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={() => changeDateBy(-1)}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "8px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: "#475569",
                fontWeight: 700,
                fontSize: "13px"
              }}
              title="წინა დღე"
            >
              <IoArrowBackOutline size={16} />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                border: "1.5px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: "14px",
                outline: "none",
                cursor: "pointer"
              }}
            />

            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              style={{
                background: selectedDate === todayStr ? "#2563eb" : "#f1f5f9",
                color: selectedDate === todayStr ? "#ffffff" : "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "8px 14px",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: "13px"
              }}
            >
              დღეს
            </button>

            <button
              type="button"
              onClick={() => changeDateBy(1)}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "8px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: "#475569",
                fontWeight: 700,
                fontSize: "13px"
              }}
              title="შემდეგი დღე"
            >
              <IoArrowForwardOutline size={16} />
            </button>
          </div>

          <span
            style={{
              background: "#eff6ff",
              color: "#1e40af",
              padding: "6px 14px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 700,
              border: "1px solid #bfdbfe"
            }}
          >
            📅 {formatGeorgianDate(selectedDate)}
          </span>
        </div>

        {/* View Switcher Pills */}
        <div style={{ display: "flex", gap: "8px", background: "#f8fafc", padding: "4px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          <button
            type="button"
            onClick={() => setActiveSubTab("schedule")}
            style={{
              background: activeSubTab === "schedule" ? "#2563eb" : "transparent",
              color: activeSubTab === "schedule" ? "#ffffff" : "#64748b",
              border: "none",
              padding: "8px 18px",
              borderRadius: "10px",
              fontWeight: 800,
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s",
              boxShadow: activeSubTab === "schedule" ? "0 2px 8px rgba(37, 99, 235, 0.3)" : "none"
            }}
          >
            📅 დღის განრიგის შეტანა
            {routineItems.length > 0 && (
              <span
                style={{
                  background: activeSubTab === "schedule" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                  color: activeSubTab === "schedule" ? "#ffffff" : "#475569",
                  padding: "2px 7px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 800
                }}
              >
                {routineItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("photos")}
            style={{
              background: activeSubTab === "photos" ? "#7c3aed" : "transparent",
              color: activeSubTab === "photos" ? "#ffffff" : "#64748b",
              border: "none",
              padding: "8px 18px",
              borderRadius: "10px",
              fontWeight: 800,
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s",
              boxShadow: activeSubTab === "photos" ? "0 2px 8px rgba(124, 58, 237, 0.3)" : "none"
            }}
          >
            📸 აქტივობის ფოტოები
            {photos.length > 0 && (
              <span
                style={{
                  background: activeSubTab === "photos" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                  color: activeSubTab === "photos" ? "#ffffff" : "#475569",
                  padding: "2px 7px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 800
                }}
              >
                {photos.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DAILY SCHEDULE ENTRY */}
      {activeSubTab === "schedule" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Add Activity Form Card (Manual typing with keyboard) */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 25px rgba(0,0,0,0.04)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                  <IoAddCircleOutline size={22} color="#2563eb" />
                  დღის განრიგის შეტანა კლავიატურით ({formatGeorgianDate(selectedDate)})
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                  შეიყვანეთ დრო და აქტივობის დასახელება კლავიატურით. მონაცემები შეინახება არჩეული თარიღისთვის.
                </p>
              </div>

              {routineItems.length === 0 && (
                <button
                  type="button"
                  onClick={handleSeedDefaultRoutine}
                  style={{
                    background: "#f0fdf4",
                    color: "#15803d",
                    border: "1px solid #bbf7d0",
                    padding: "8px 16px",
                    borderRadius: "12px",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <IoSparklesOutline size={16} />
                  ✨ ნაგულისხმევი 9 აქტივობის ჩატვირთვა
                </button>
              )}
            </div>

            <form onSubmit={handleAddRoutineItem} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Row 1: Time Start, Time End, Icon Emoji Picker */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                    ⏰ დაწყების დრო:
                  </label>
                  <input
                    type="time"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "15px",
                      fontWeight: 700,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                    ⏰ დასრულების დრო:
                  </label>
                  <input
                    type="time"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "15px",
                      fontWeight: 700,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                    🎨 სიმბოლო / ემოჯი:
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "24px", width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                      {icon}
                    </span>
                    <div style={{ display: "flex", gap: "4px", overflowX: "auto", paddingBottom: "4px", flex: 1 }}>
                      {QUICK_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setIcon(em)}
                          style={{
                            background: icon === em ? "#2563eb" : "#f8fafc",
                            border: icon === em ? "1px solid #2563eb" : "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "6px 8px",
                            fontSize: "16px",
                            cursor: "pointer"
                          }}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Title input (Typed freely via keyboard) */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  ✍️ აქტივობის დასახელება (შეიყვანეთ კლავიატურით):
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="მაგ. დილის მიღება და გამახურებელი ვარჯიში, ხატვა, ზღაპრის კითხვა..."
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "15px",
                    fontWeight: 600,
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Row 3: Description input (Typed freely via keyboard) */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  📝 აღწერა ან დამატებითი დეტალები (სურვილისამებრ):
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="მაგ. ფერადი ფანქრებით შემოდგომის ფოთლების ხატვა, წვრილი მოტორიკის განვითარება..."
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Submit button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  disabled={savingItem}
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    padding: "12px 28px",
                    borderRadius: "14px",
                    fontWeight: 800,
                    fontSize: "15px",
                    cursor: savingItem ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <IoAddCircleOutline size={20} />
                  {savingItem ? "ინახება..." : "➕ აქტივობის დამატება განრიგში"}
                </button>
              </div>
            </form>
          </div>

          {/* Scheduled Activities Timeline List for this Date */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 25px rgba(0,0,0,0.04)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                  📋 დღის განრიგი ({formatGeorgianDate(selectedDate)})
                </h3>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  სულ: {routineItems.length} აქტივობა
                </span>
              </div>
            </div>

            {loadingSchedule ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b", fontWeight: 700 }}>
                განრიგის ჩატვირთვა...
              </div>
            ) : routineItems.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  borderRadius: "18px",
                  background: "#f8fafc",
                  border: "2px dashed #cbd5e1"
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📅</div>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 800, color: "#1e293b" }}>
                  ამ თარიღისთვის განრიგი ჯერ არ არის შეტანილი
                </h4>
                <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
                  შეიტანეთ პირველი აქტივობა კლავიატურით ზემოთ მოცემული ფორმით, ან ჩატვირთეთ ნაგულისხმევი 9 აქტივობა.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {routineItems.map((item, idx) => (
                  <div
                    key={item._id || idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 20px",
                      borderRadius: "16px",
                      background: "#f8fafc",
                      border: "1.5px solid #e2e8f0",
                      flexWrap: "wrap",
                      gap: "14px",
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: "1 1 300px" }}>
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "14px",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "24px",
                          flexShrink: 0
                        }}
                      >
                        {item.icon || "🌟"}
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span
                            style={{
                              background: "#2563eb",
                              color: "#ffffff",
                              padding: "3px 10px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <IoTimeOutline size={14} />
                            {item.time_start} - {item.time_end}
                          </span>
                          {item.date && (
                            <span style={{ fontSize: "11px", color: "#059669", background: "#d1fae5", padding: "2px 8px", borderRadius: "6px", fontWeight: 700 }}>
                              {item.date}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                          {item.title}
                        </div>

                        {item.description && (
                          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions: Edit & Delete */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setEditingItem({ ...item })}
                        style={{
                          background: "#eff6ff",
                          color: "#2563eb",
                          border: "1px solid #bfdbfe",
                          borderRadius: "10px",
                          padding: "8px 14px",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <IoPencilOutline size={15} />
                        შეცვლა
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRoutineItem(item._id)}
                        style={{
                          background: "#fef2f2",
                          color: "#ef4444",
                          border: "1px solid #fecaca",
                          borderRadius: "10px",
                          padding: "8px 14px",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <IoTrashOutline size={15} />
                        წაშლა
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ACTIVITY PHOTOS */}
      {activeSubTab === "photos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Photo Upload Form Card (Manual keyboard entry for title & desc) */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 25px rgba(0,0,0,0.04)"
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <IoCameraOutline size={22} color="#7c3aed" />
                📸 აქტივობის ფოტოს ატვირთვა ({formatGeorgianDate(selectedDate)})
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                ატვირთეთ ამ დღეს ჯგუფში ჩატარებული აქტივობის ფოტო. შეიყვანეთ აქტივობის დასახელება კლავიატურით.
              </p>
            </div>

            <form onSubmit={handleUploadPhoto} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* File Dropzone / Picker */}
              <div
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: "18px",
                  padding: "24px",
                  textAlign: "center",
                  background: "#f8fafc",
                  cursor: "pointer",
                  position: "relative"
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />

                {previewUrl ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                    <img
                      src={previewUrl}
                      alt="Preview"
                      style={{
                        maxHeight: "220px",
                        maxWidth: "100%",
                        borderRadius: "14px",
                        objectFit: "contain",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
                      }}
                    />
                    <span style={{ fontSize: "13px", color: "#2563eb", fontWeight: 700 }}>
                      📷 დააწკაპუნეთ სხვა ფოტოს ასარჩევად
                    </span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "16px",
                        background: "#ede9fe",
                        color: "#7c3aed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <IoCloudUploadOutline size={28} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "15px", color: "#0f172a" }}>
                      დააწკაპუნეთ ფოტოს ასარჩევად ან გადასაღებად
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                      JPG, PNG, WebP (ავტომატურად კომპრესირდება)
                    </div>
                  </div>
                )}
              </div>

              {/* Activity title (manual keyboard typing) */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  🎯 აქტივობის დასახელება (შეიყვანეთ კლავიატურით):
                </label>
                <input
                  type="text"
                  value={photoActivityTitle}
                  onChange={(e) => setPhotoActivityTitle(e.target.value)}
                  placeholder="მაგ. ხატვის გაკვეთილი, ეზოში თამაში, დილის ვარჯიში..."
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "15px",
                    fontWeight: 600,
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Description (manual keyboard typing) */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  📝 აღწერა ან შენიშვნა (სურვილისამებრ):
                </label>
                <input
                  type="text"
                  value={photoDescription}
                  onChange={(e) => setPhotoDescription(e.target.value)}
                  placeholder="მოკლე აღწერა..."
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Submit button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  disabled={uploadingPhoto || !previewUrl}
                  style={{
                    background: "#7c3aed",
                    color: "#ffffff",
                    border: "none",
                    padding: "12px 30px",
                    borderRadius: "14px",
                    fontWeight: 800,
                    fontSize: "15px",
                    cursor: uploadingPhoto || !previewUrl ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(124, 58, 237, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: !previewUrl ? 0.6 : 1
                  }}
                >
                  <IoCloudUploadOutline size={20} />
                  {uploadingPhoto ? "იტვირთება..." : "💾 ფოტოს ატვირთვა"}
                </button>
              </div>
            </form>
          </div>

          {/* Photo Gallery for Selected Date */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 25px rgba(0,0,0,0.04)"
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                📸 ატვირთული ფოტოები ({formatGeorgianDate(selectedDate)})
              </h3>
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                სულ: {photos.length} ფოტო
              </span>
            </div>

            {loadingPhotos ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b", fontWeight: 700 }}>
                ფოტოების ჩატვირთვა...
              </div>
            ) : photos.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  borderRadius: "18px",
                  background: "#f8fafc",
                  border: "2px dashed #cbd5e1"
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📸</div>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 800, color: "#1e293b" }}>
                  ამ თარიღისთვის ფოტოები ჯერ არ არის ატვირთული
                </h4>
                <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
                  ატვირთეთ პირველი აქტივობის ფოტო ზემოთ მოცემული ფორმით.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "18px" }}>
                {photos.map((p) => (
                  <div
                    key={p._id}
                    style={{
                      background: "#ffffff",
                      borderRadius: "18px",
                      border: "1px solid #e2e8f0",
                      overflow: "hidden",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.04)",
                      display: "flex",
                      flexDirection: "column"
                    }}
                  >
                    <div
                      style={{ position: "relative", height: "180px", cursor: "pointer", background: "#0f172a" }}
                      onClick={() => setActiveLightbox(p)}
                    >
                      <img
                        src={p.photo_url}
                        alt={p.activity_title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: "8px",
                          right: "8px",
                          background: "rgba(0,0,0,0.6)",
                          color: "#ffffff",
                          borderRadius: "8px",
                          padding: "4px 8px",
                          fontSize: "11px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <IoEyeOutline size={14} /> დათვალიერება
                      </div>
                    </div>

                    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "15px", color: "#0f172a" }}>
                          {p.activity_title}
                        </div>
                        {p.description && (
                          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                            {p.description}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>
                          📅 {p.date}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(p._id)}
                          style={{
                            background: "#fef2f2",
                            color: "#ef4444",
                            border: "1px solid #fecaca",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <IoTrashOutline size={14} /> წაშლა
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT ROUTINE ITEM MODAL */}
      {editingItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setEditingItem(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                ✏️ აქტივობის შეცვლა (კლავიატურით)
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <IoCloseCircleOutline size={26} />
              </button>
            </div>

            <form onSubmit={handleUpdateRoutineItem} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                    დაწყების დრო:
                  </label>
                  <input
                    type="time"
                    value={editingItem.time_start}
                    onChange={(e) => setEditingItem({ ...editingItem, time_start: e.target.value })}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontWeight: 700, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                    დასრულების დრო:
                  </label>
                  <input
                    type="time"
                    value={editingItem.time_end}
                    onChange={(e) => setEditingItem({ ...editingItem, time_end: e.target.value })}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontWeight: 700, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  აქტივობის დასახელება (კლავიატურით):
                </label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  required
                  style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontWeight: 700, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  აღწერა ან შენიშვნა:
                </label>
                <input
                  type="text"
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1.5px solid #cbd5e1", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "10px 18px", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "10px 22px", borderRadius: "10px", fontWeight: 800, cursor: "pointer" }}
                >
                  {savingItem ? "ინახება..." : "შენახვა"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {activeLightbox && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setActiveLightbox(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveLightbox(null)}
              style={{
                position: "absolute",
                top: "-40px",
                right: "0",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                cursor: "pointer"
              }}
            >
              <IoCloseCircleOutline size={32} />
            </button>

            <img
              src={activeLightbox.photo_url}
              alt={activeLightbox.activity_title}
              style={{
                maxWidth: "100%",
                maxHeight: "75vh",
                borderRadius: "16px",
                objectFit: "contain",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
              }}
            />

            <div style={{ marginTop: "14px", textAlign: "center", color: "#ffffff" }}>
              <div style={{ fontWeight: 800, fontSize: "18px" }}>
                {activeLightbox.activity_title}
              </div>
              {activeLightbox.description && (
                <div style={{ fontSize: "14px", opacity: 0.85, marginTop: "4px" }}>
                  {activeLightbox.description}
                </div>
              )}
              <div style={{ fontSize: "12px", opacity: 0.6, marginTop: "4px" }}>
                📅 {activeLightbox.date} • {activeLightbox.teacher_name}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
