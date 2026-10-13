import React, { useState, useEffect } from 'react';
import { IoArrowBack, IoSearch } from 'react-icons/io5';
import { FaTrashAlt, FaEdit } from 'react-icons/fa';
import { MdRestorePage } from 'react-icons/md';
import { getPaymentStatus } from '@/lib/payment';

const ArrowLeftIcon = IoArrowBack as React.FC<{ size?: number | string }>;
const SearchIcon = IoSearch as React.FC<{ size?: number | string; style?: React.CSSProperties }>;
const TrashIcon = FaTrashAlt as React.FC;
const RestoreIcon = MdRestorePage as React.FC;
const EditIcon = FaEdit as React.FC;

interface Student {
    _id: string;
    name: string;
    surname: string;
    user_ID: string;
    ID?: string;
    role?: string;
    image?: string;
    class_id?: string;
    classInfo?: {
        _id?: string;
        ID?: string;
        classname: string;
    };
    payment_due_day?: number;
    payment_amount?: number;
    payment_status?: 'paid' | 'unpaid';
}

interface Class {
    _id: string;
    ID?: string;
    classname: string;
}

interface StudentListProps {
    students: Student[];
    classes: Class[];
    classFilter: number | string | null;
    parallelFilter: string | null;
    selectedColor: string;
    logoutButtonStyle: React.CSSProperties;
    onBackClick: () => void;
    onGradeClick: (grade: number | string | null) => void;
    onParallelFilterClick: (filter: string | null) => void;
    onDeleteStudent: (studentId: string) => void;
    onResetPassword: (studentId: string) => void;
    onEditStudent: (student: Student) => void;
    onViewStudentCard: (student: Student) => void;
    isReadOnly?: boolean;
}

const StudentList: React.FC<StudentListProps> = ({
    students,
    classes,
    classFilter,
    parallelFilter,
    selectedColor,
    onBackClick,
    onGradeClick,
    onParallelFilterClick,
    onDeleteStudent,
    onResetPassword,
    onEditStudent,
    onViewStudentCard,
    isReadOnly = false,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [localStudents, setLocalStudents] = useState<Student[]>(students);

    useEffect(() => {
        setLocalStudents(students);
    }, [students]);

    const handleTogglePaymentStatus = async (student: Student) => {
        const isCurrentlyPaid = student.payment_status === 'paid';
        const nextStatus = isCurrentlyPaid ? 'unpaid' : 'paid';

        // Optimistic UI update
        setLocalStudents(prev => prev.map(s => s._id === student._id ? { ...s, payment_status: nextStatus } : s));

        try {
            const monthsGeorgian = [
                'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
                'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
            ];
            const currentMonthName = monthsGeorgian[new Date().getMonth()];

            await Promise.all([
                fetch(`/api/student/update/${student._id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        _id: student._id,
                        name: student.name,
                        surname: student.surname,
                        user_ID: student.user_ID,
                        class_id: student.classInfo?._id || "",
                        payment_status: nextStatus
                    })
                }),
                fetch('/api/student/pay-month', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_id: student._id || student.user_ID,
                        month: currentMonthName,
                        status: nextStatus
                    })
                })
            ]);
        } catch (err) {
            console.error('Error toggling payment status:', err);
        }
    };

    const getClassNameStr = (item: any): string => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        return item.classname || item.ID || item.name || '';
    };

    // Extract available parallel letters for the selected grade filter
    const parallelLetters = Array.from(new Set(
        classes
            .filter(c => {
                const name = getClassNameStr(c);
                if (!name) return false;
                const match = name.match(/(\d+)/);
                return match && parseInt(match[1], 10) === Number(classFilter);
            })
            .map(c => {
                const name = getClassNameStr(c);
                if (!name) return null;
                const match = name.match(/[ა-ჰa-zA-Z]/);
                return match ? match[0] : null;
            })
            .filter((l): l is string => Boolean(l))
    )).sort((a, b) => {
        const georgianOrder = 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ';
        const aIndex = georgianOrder.indexOf(a || '');
        const bIndex = georgianOrder.indexOf(b || '');
        return aIndex - bIndex;
    });

    // Extract unique list of group names from classes (e.g. "ვარსკვლავები", "ფუტკრები", "2-3 წელი")
    const availableGroupNames = Array.from(new Set(
        classes.map(c => getClassNameStr(c)).filter(Boolean)
    ));

    // Filter students by group name or grade if classFilter is set
    const studentsInGrade = classFilter === null
        ? localStudents
        : localStudents.filter(student => {
            if (!classFilter) return true;
            
            const filterStr = String(classFilter).trim().toLowerCase();

            // Find matching class object from classes array
            const matchedClass = classes.find(c => 
                String(c._id).toLowerCase() === filterStr ||
                getClassNameStr(c).toLowerCase() === filterStr ||
                (c.ID && String(c.ID).toLowerCase() === filterStr)
            );

            const sClassId = student.class_id ? String(student.class_id).toLowerCase() : '';
            const sInfoId = student.classInfo?._id ? String(student.classInfo._id).toLowerCase() : '';
            const sClassName = getClassNameStr(student.classInfo).toLowerCase();

            // 1. Direct class_id match with matchedClass._id or filterStr
            if (matchedClass && (sClassId === String(matchedClass._id).toLowerCase() || sInfoId === String(matchedClass._id).toLowerCase())) {
                return true;
            }
            if (sClassId === filterStr || sInfoId === filterStr) {
                return true;
            }

            // 2. Direct group name match
            if (sClassName && (sClassName === filterStr || (matchedClass && sClassName === getClassNameStr(matchedClass).toLowerCase()))) {
                return true;
            }

            // 3. Fallback numeric grade match
            const matchDigits = filterStr.match(/^(\d+)$/);
            if (matchDigits && sClassName) {
                const sDigits = sClassName.match(/(\d+)/);
                if (sDigits && sDigits[1] === matchDigits[1]) {
                    return true;
                }
            }

            return false;
        });

    // Filter by parallel letter if selected
    const filteredStudents = parallelFilter
        ? studentsInGrade.filter(student => {
            const name = getClassNameStr(student?.classInfo);
            if (!name) return false;
            const match = name.match(/[ა-ჰa-zA-Z]/);
            return match && match[0] === parallelFilter;
        })
        : studentsInGrade;

    // Apply manual search filter
    const finalFilteredStudents = filteredStudents.filter(student => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        const name = (student.name || '').toLowerCase();
        const surname = (student.surname || '').toLowerCase();
        const fullName = `${name} ${surname}`;
        const id = (student.ID || student.user_ID || '').toLowerCase();
        const classNameStr = getClassNameStr(student.classInfo).toLowerCase();
        return fullName.includes(query) || name.includes(query) || surname.includes(query) || id.includes(query) || classNameStr.includes(query);
    });

    // Build unique list of numeric grades present in classes, with default 1..12 fallback
    const parsedGrades = Array.from(new Set(
        classes
            .map(c => {
                const name = getClassNameStr(c);
                if (!name) return null;
                const match = name.match(/(\d+)/);
                return match ? parseInt(match[1], 10) : null;
            })
            .filter((g): g is number => g !== null)
    )).sort((a, b) => a - b);

    const grades = parsedGrades.length > 0 ? parsedGrades : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const getActiveStyle = (active: boolean) => {
        return active
            ? {
                background: `linear-gradient(135deg, ${selectedColor} 0%, #3a8dde 100%)`,
                boxShadow: `0 4px 15px ${selectedColor}4D`,
                borderColor: `${selectedColor}aa`,
              }
            : {};
    };

    return (
        <div className="admin-view-container animate-fade-in-down" style={{ width: '100%', maxWidth: '1200px' }}>
            <header className="admin-view-header">
                <button className="admin-back-btn" onClick={onBackClick}>
                    <ArrowLeftIcon size={20} /> უკან
                </button>
                <h2 className="admin-view-title">აღსაზრდელთა სია ({finalFilteredStudents.length})</h2>
            </header>

            {/* Manual Search Bar */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
                    <SearchIcon style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                    <input
                        type="text"
                        placeholder="ძებნა ხელით (სახელი, გვარი, პ/ნ, ჯგუფი)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 16px 12px 42px',
                            borderRadius: '14px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '14px',
                            fontWeight: '600',
                            outline: 'none',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                        }}
                    />
                </div>
            </div>

            {/* Grade / Group Filters */}
            <div style={{ marginBottom: '30px', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                <button 
                    onClick={() => onGradeClick(null)} 
                    className={`admin-filter-btn ${classFilter === null ? 'active' : ''}`}
                    style={getActiveStyle(classFilter === null)}
                >
                    ყველა ჯგუფი
                </button>
                {(availableGroupNames.length > 0 ? availableGroupNames : grades).map(grp => (
                    <button 
                        key={String(grp)} 
                        onClick={() => onGradeClick(grp as any)} 
                        className={`admin-filter-btn ${classFilter === grp ? 'active' : ''}`}
                        style={getActiveStyle(classFilter === grp)}
                    >
                        {grp}
                    </button>
                ))}
            </div>

            {/* Parallel Filters */}
            {classFilter !== null && parallelLetters.length > 0 && (
                <div className="animate-zoom-in" style={{ marginBottom: '30px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                    <button 
                        onClick={() => onParallelFilterClick(null)} 
                        className={`admin-filter-btn ${parallelFilter === null ? 'active' : ''}`}
                        style={getActiveStyle(parallelFilter === null)}
                    >
                        ყველა
                    </button>
                    {parallelLetters.map(pLetter => (
                        <button 
                            key={pLetter} 
                            onClick={() => onParallelFilterClick(pLetter as string)} 
                            className={`admin-filter-btn ${parallelFilter === pLetter ? 'active' : ''}`}
                            style={getActiveStyle(parallelFilter === pLetter)}
                        >
                            {pLetter}
                        </button>
                    ))}
                </div>
            )}

            {/* Student Table */}
            <div className="admin-list-container animate-zoom-in">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>სახელი</th>
                            <th>გვარი</th>
                            <th>პ/ნ</th>
                            <th>ჯგუფი / ასაკი</th>
                            <th>გადასახადის ვადა</th>
                            <th style={{ textAlign: 'center' }}>ქმედება</th>
                        </tr>
                    </thead>
                    <tbody>
                        {finalFilteredStudents.length > 0 ? finalFilteredStudents.map((student) => {
                            const pStatus = getPaymentStatus(student.payment_due_day, student.payment_amount, student.payment_status);
                            const studentId = student._id || student.user_ID || student.ID || (student as any).id || '';
                            return (
                            <tr key={studentId}>
                                <td>{student.name}</td>
                                <td>{student.surname}</td>
                                <td>{student.ID || student.user_ID}</td>
                                <td>{getClassNameStr(student.classInfo) || 'N/A'}</td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'black' }}>
                                            {pStatus.dueDay} რიცხვი ({pStatus.amount} ₾)
                                        </span>
                                        <span style={{ 
                                            display: 'inline-block',
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            backgroundColor: `${pStatus.badgeColor}22`,
                                            color: pStatus.badgeColor,
                                            border: `1px solid ${pStatus.badgeColor}55`,
                                            fontWeight: 700,
                                            width: 'fit-content'
                                        }}>
                                            {pStatus.badgeText}
                                        </span>
                                        {!isReadOnly && (
                                            <button
                                                type="button"
                                                onClick={() => handleTogglePaymentStatus(student)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    border: student.payment_status === 'paid' ? '1px solid #10b981' : '1px solid #2563eb',
                                                    background: student.payment_status === 'paid' ? 'rgba(16, 185, 129, 0.12)' : '#2563eb',
                                                    color: student.payment_status === 'paid' ? '#059669' : '#ffffff',
                                                    cursor: 'pointer',
                                                    width: 'fit-content',
                                                    transition: 'all 0.2s ease',
                                                    marginTop: '2px'
                                                }}
                                                title="დააჭირეთ თვიური გადასახადის სტატუსის განასახლებლად"
                                            >
                                                {student.payment_status === 'paid' ? '🟢 გადახდა დადასტურებულია' : '💳 გადახდის განახლება (დადასტურება)'}
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                                        <button 
                                            className="admin-table-action-btn"
                                            onClick={() => onViewStudentCard(student)} 
                                            style={{ 
                                                background: `linear-gradient(135deg, ${selectedColor} 0%, #3a8dde 100%)`, 
                                                boxShadow: `0 4px 12px ${selectedColor}3D`
                                            }} 
                                            title="აღსაზრდელის ქარდი"
                                        >
                                            ქარდი
                                        </button>
                                        {!isReadOnly && (
                                            <>
                                                <button className="admin-action-btn edit" onClick={() => onEditStudent(student)} title="რედაქტირება">
                                                    <EditIcon />
                                                </button>
                                                <button className="admin-action-btn delete" onClick={() => onDeleteStudent(studentId)} title="წაშლა">
                                                    <TrashIcon />
                                                </button>
                                                <button className="admin-action-btn reset" onClick={() => onResetPassword(studentId)} title="აღდგენა">
                                                    <RestoreIcon />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                        }) : (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                                    აღსაზრდელი ვერ მოიძებნა
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentList;