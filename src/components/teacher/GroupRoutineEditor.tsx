"use client";
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IoTimeOutline, IoAddCircleOutline, IoTrashOutline, IoPencilOutline, IoSparklesOutline, IoCloseOutline } from "react-icons/io5";

interface GroupRoutineItem {
  _id?: string;
  class_id: string;
  time_start: string;
  time_end: string;
  title: string;
  description?: string;
  icon?: string;
  day_of_week?: number;
}

interface GroupRoutineEditorProps {
  classId: string;
  classNameStr?: string;
  selectedColor?: string;
  showToast?: (msg: string, type: "success" | "error") => void;
}

const EMOJI_OPTIONS = ["🌅", "🍳", "📚", "⚽", "🧩", "🍲", "😴", "🍎", "🎨", "🎵", "🧼", "📖", "🧸", "🧘", "🚀"];

const PRESET_ROUTINE_ACTIVITIES = [
  { emoji: "🌅", name: "დილის მიღება & ვარჯიში" },
  { emoji: "🍳", name: "საუზმე" },
  { emoji: "📚", name: "შემეცნებითი მეცადინეობა" },
  { emoji: "🎨", name: "ხატვა & ძერწვა" },
  { emoji: "🎵", name: "მუსიკა & ცეკვა" },
  { emoji: "⚽", name: "ეზოში სეირნობა & თამაშები" },
  { emoji: "🍲", name: "სადილი" },
  { emoji: "😴", name: "დღის ძილი" },
  { emoji: "🍎", name: "სამხარი" },
  { emoji: "🧩", name: "განმავითარებელი თამაშები" },
  { emoji: "📖", name: "ზღაპრის კითხვა" },
];

const WEEKDAYS = [
  { id: -1, label: "ყველა დღე", short: "ყველა" },
  { id: 0, label: "ყოველი დღე (ორშ-პარ)", short: "ყოველდღე" },
  { id: 1, label: "ორშაბათი", short: "ორშაბათი" },
  { id: 2, label: "სამშაბათი", short: "სამშაბათი" },
  { id: 3, label: "ოთხშაბათი", short: "ოთხშაბათი" },
  { id: 4, label: "ხუთშაბათი", short: "ხუთშაბათი" },
  { id: 5, label: "პარასკევი", short: "პარასკევი" }
];

export const GroupRoutineEditor: React.FC<GroupRoutineEditorProps> = ({
  classId,
  classNameStr = "ჯგუფი",
  selectedColor = "#2563eb",
  showToast
}) => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GroupRoutineItem | null>(null);

  // Day filter for viewing
  const [selectedDayFilter, setSelectedDayFilter] = useState<number>(-1);

  // Form state
  const [timeStart, setTimeStart] = useState("09:00");
  const [timeEnd, setTimeEnd] = useState("09:30");
  const [title, setTitle] = useState("");
  const [selectedPresetActivities, setSelectedPresetActivities] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🍳");
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const { data: routineItems = [], isLoading } = useQuery<GroupRoutineItem[]>({
    queryKey: ["group-routine-items", classId],
    queryFn: async () => {
      if (!classId) return [];
      const res = await fetch(`/api/class/group-routine?class_id=${classId}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!classId,
  });

  const toggleRoutinePreset = (item: { emoji: string; name: string }) => {
    setSelectedPresetActivities((prev) => {
      let next: string[];
      if (prev.includes(item.name)) {
        next = prev.filter((n) => n !== item.name);
      } else {
        next = [...prev, item.name];
        setIcon(item.emoji);
      }
      setTitle(next.join(" & "));
      return next;
    });
  };

  const openAddModal = () => {
    setEditingItem(null);
    setTimeStart("09:00");
    setTimeEnd("09:30");
    setTitle("");
    setSelectedPresetActivities([]);
    setDescription("");
    setIcon("🍳");
    setDayOfWeek(selectedDayFilter > 0 ? selectedDayFilter : 0);
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: GroupRoutineItem) => {
    setEditingItem(item);
    setTimeStart(item.time_start || "09:00");
    setTimeEnd(item.time_end || "09:30");
    setTitle(item.title || "");
    const matched = PRESET_ROUTINE_ACTIVITIES.filter(p => (item.title || "").includes(p.name)).map(p => p.name);
    setSelectedPresetActivities(matched);
    setDescription(item.description || "");
    setIcon(item.icon || "🍳");
    setDayOfWeek(item.day_of_week !== undefined ? item.day_of_week : 0);
    setIsAddModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !timeStart) {
      if (showToast) showToast("გთხოვთ შეავსოთ სათაური და დაწყების დრო", "error");
      return;
    }

    setLoading(true);
    try {
      const isEdit = !!editingItem;
      const url = "/api/class/group-routine";
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit
        ? { _id: editingItem._id, time_start: timeStart, time_end: timeEnd, title, description, icon, day_of_week: dayOfWeek }
        : { class_id: classId, time_start: timeStart, time_end: timeEnd, title, description, icon, day_of_week: dayOfWeek };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (res.ok) {
        if (showToast) showToast(isEdit ? "აქტივობა განახლდა" : "აქტივობა დაემატა", "success");
        queryClient.invalidateQueries({ queryKey: ["group-routine-items", classId] });
        setIsAddModalOpen(false);
      } else {
        if (showToast) showToast(resData.message || "შეცდომა მოხდა", "error");
      }
    } catch {
      if (showToast) showToast("სერვერთან დაკავშირება ვერ მოხერხდა", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id?: string) => {
    if (!id) return;
    if (!window.confirm("დარწმუნებული ხართ, რომ გსურთ ამ აქტივობის წაშლა?")) return;

    try {
      const res = await fetch(`/api/class/group-routine?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (showToast) showToast("აქტივობა წაიშალა", "success");
        queryClient.invalidateQueries({ queryKey: ["group-routine-items", classId] });
      } else {
        if (showToast) showToast("წაშლა ვერ მოხერხდა", "error");
      }
    } catch {
      if (showToast) showToast("შეცდომა მოხდა", "error");
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm("გსურთ ჯგუფისთვის საბავშვო ბაღის ნაგულისხმევი 9 აქტივობის ჩატვირთვა?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/class/group-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: classId, action: "seed_default" }),
      });

      if (res.ok) {
        if (showToast) showToast("ნაგულისხმევი განრიგი წარმატებით ჩაიტვირთა", "success");
        queryClient.invalidateQueries({ queryKey: ["group-routine-items", classId] });
      } else {
        if (showToast) showToast("ჩატვირთვა ვერ მოხერხდა", "error");
      }
    } catch {
      if (showToast) showToast("შეცდომა მოხდა", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "24px",
      padding: "28px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
      marginTop: "24px"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px",
        marginBottom: "24px",
        paddingBottom: "20px",
        borderBottom: "1px solid #f1f5f9"
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "10px" }}>
            🧸 ჯგუფის დღის განრიგის ჩამონათვალი ({classNameStr})
          </h3>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b", fontWeight: 600 }}>
            აღმზრდელს შეყავს დღის რეჟიმი, რომელსაც მშობლები და აღსაზრდელები ნახულობენ
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={loading}
            style={{
              background: "#f1f5f9",
              color: "#334155",
              border: "1px solid #cbd5e1",
              padding: "10px 18px",
              borderRadius: "14px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <IoSparklesOutline size={16} color="#6366f1" />
            შაბლონის ჩატვირთვა
          </button>

          <button
            type="button"
            onClick={openAddModal}
            style={{
              background: `linear-gradient(135deg, ${selectedColor} 0%, #3a8dde 100%)`,
              color: "#ffffff",
              border: "none",
              padding: "10px 20px",
              borderRadius: "14px",
              fontWeight: 800,
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: `0 4px 14px ${selectedColor}4D`
            }}
          >
            <IoAddCircleOutline size={18} />
            ახალი აქტივობის შეტანა
          </button>
        </div>
      </div>

      {/* Day Filter Tabs */}
      <div style={{
        display: "flex",
        gap: "8px",
        overflowX: "auto",
        paddingBottom: "12px",
        marginBottom: "20px"
      }}>
        {WEEKDAYS.map(wd => {
          const isSelected = selectedDayFilter === wd.id;
          return (
            <button
              key={wd.id}
              type="button"
              onClick={() => setSelectedDayFilter(wd.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "12px",
                background: isSelected ? selectedColor : "#f1f5f9",
                color: isSelected ? "#ffffff" : "#475569",
                border: "none",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: isSelected ? `0 4px 12px ${selectedColor}44` : "none",
                transition: "all 0.2s"
              }}
            >
              {wd.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>
          დღის განრიგი იტვირთება...
        </div>
      ) : routineItems.length === 0 ? (
        <div style={{
          padding: "40px 20px",
          textAlign: "center",
          background: "#f8fafc",
          borderRadius: "18px",
          border: "2px dashed #cbd5e1"
        }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>🧸</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#334155" }}>
            ამ ჯგუფისთვის დღის განრიგის ჩამონათვალი ჯერ არ არის შეყვანილი
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", marginTop: "6px", marginBottom: "16px" }}>
            შეგიძლიათ გამოიყენოთ "შაბლონის ჩატვირთვა" ან დაამატოთ ინდივიდუალური აქტივობები
          </div>
          <button
            onClick={handleSeedDefaults}
            style={{
              background: selectedColor,
              color: "white",
              border: "none",
              padding: "10px 24px",
              borderRadius: "12px",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            ✨ ნაგულისხმევი 9 აქტივობის ჩატვირთვა
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {routineItems
            .filter(item => {
              if (selectedDayFilter === -1) return true;
              if (selectedDayFilter === 0) return item.day_of_week === 0 || item.day_of_week === undefined;
              return item.day_of_week === selectedDayFilter || item.day_of_week === 0 || item.day_of_week === undefined;
            })
            .map((item, index) => {
              const dayObj = WEEKDAYS.find(w => w.id === item.day_of_week);
              const dayText = dayObj ? dayObj.short : "ყოველდღე";
              return (
                <div
                  key={item._id || index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    borderRadius: "16px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    transition: "transform 0.2s, boxShadow 0.2s",
                    gap: "16px",
                    flexWrap: "wrap"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: "240px" }}>
                    <div style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "14px",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      {item.icon || "📅"}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: "8px",
                          background: "#eff6ff",
                          color: "#2563eb",
                          fontWeight: 800,
                          fontSize: "13px",
                          border: "1px solid #bfdbfe",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          <IoTimeOutline size={14} />
                          {item.time_start} - {item.time_end}
                        </span>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "8px",
                          background: item.day_of_week === 0 ? "#fef3c7" : "#f0fdf4",
                          color: item.day_of_week === 0 ? "#b45309" : "#15803d",
                          fontWeight: 700,
                          fontSize: "12px",
                          border: item.day_of_week === 0 ? "1px solid #fde68a" : "1px solid #bbf7d0"
                        }}>
                          📅 {dayText}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: "16px", color: "#0f172a" }}>
                          {item.title}
                        </span>
                      </div>
                      {item.description && (
                        <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginTop: "4px" }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: "#334155",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <IoPencilOutline size={16} /> შეცვლა
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item._id)}
                      style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#ef4444",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <IoTrashOutline size={16} /> წაშლა
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Add / Edit Activity Modal */}
      {isAddModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "24px",
            width: "100%",
            maxWidth: "500px",
            padding: "28px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            position: "relative"
          }}>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "transparent",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#64748b"
              }}
            >
              <IoCloseOutline />
            </button>

            <h3 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
              {editingItem ? "დღის განრიგის აქტივობის შეცვლა" : "ახალი დღის აქტივობის შეტანა"}
            </h3>

            <form onSubmit={handleSaveItem} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  კვირის დღე / რეჟიმი
                </label>
                <select
                  value={dayOfWeek}
                  onChange={e => setDayOfWeek(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    fontWeight: 600,
                    background: "#ffffff",
                    cursor: "pointer"
                  }}
                >
                  <option value={0}>🌟 ყოველი დღე (ორშაბათი - პარასკევი)</option>
                  <option value={1}>📅 მხოლოდ ორშაბათს</option>
                  <option value={2}>📅 მხოლოდ სამშაბათს</option>
                  <option value={3}>📅 მხოლოდ ოთხშაბათს</option>
                  <option value={4}>📅 მხოლოდ ხუთშაბათს</option>
                  <option value={5}>📅 მხოლოდ პარასკევს</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    დაწყების დრო
                  </label>
                  <input
                    type="text"
                    value={timeStart}
                    onChange={e => setTimeStart(e.target.value)}
                    placeholder="მაგ: 09:00"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      fontWeight: 600
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    დასრულების დრო
                  </label>
                  <input
                    type="text"
                    value={timeEnd}
                    onChange={e => setTimeEnd(e.target.value)}
                    placeholder="მაგ: 09:30"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      fontWeight: 600
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  აირჩიეთ ემოჯი / იკონკა
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {EMOJI_OPTIONS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setIcon(em)}
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        border: icon === em ? `2px solid ${selectedColor}` : "1px solid #e2e8f0",
                        background: icon === em ? "#eff6ff" : "#ffffff",
                        fontSize: "18px",
                        cursor: "pointer"
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  აქტივობის სათაური & სწრაფი მონიშვნა
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                  {PRESET_ROUTINE_ACTIVITIES.map(preset => {
                    const isSelected = selectedPresetActivities.includes(preset.name);
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => toggleRoutinePreset(preset)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "16px",
                          border: isSelected ? `1px solid ${selectedColor}` : "1px solid #cbd5e1",
                          background: isSelected ? selectedColor : "#f8fafc",
                          color: isSelected ? "#ffffff" : "#334155",
                          fontWeight: 700,
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <span>{preset.emoji}</span>
                        <span>{preset.name}</span>
                        {isSelected && <span style={{ marginLeft: "2px", fontWeight: 900 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={e => {
                    setTitle(e.target.value);
                    const matched = PRESET_ROUTINE_ACTIVITIES.filter(p => e.target.value.includes(p.name)).map(p => p.name);
                    setSelectedPresetActivities(matched);
                  }}
                  placeholder="მაგ: დილის ვარჯიში & საუზმე"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    fontWeight: 600
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  აღწერა / დეტალები (არასავალდებულო)
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="მაგ: დილის გამახურებელი ვარჯიში და ჯანსაღი საუზმე"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    fontWeight: 600,
                    resize: "none"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  გაუქმება
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "12px",
                    border: "none",
                    background: selectedColor,
                    color: "white",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  {editingItem ? "შენახვა" : "დამატება"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupRoutineEditor;
