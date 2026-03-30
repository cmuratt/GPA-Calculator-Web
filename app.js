/* ============================================
   GPA Calculator Mobile PWA — Application Logic
   Converted from Java Swing by Murat Can IŞIK
   ============================================ */

// ── Letter Grade Definitions ──
const LETTER_GRADES = {
    AA: 4.0,
    BA: 3.5,
    BB: 3.0,
    CB: 2.5,
    CC: 2.0,
    DC: 1.5,
    DD: 1.0,
    FD: 0.5,
    FF: 0.0
};

// ── Course Model ──
class Course {
    constructor(code, credit, letterGrade) {
        this.code = code;
        this.credit = credit;
        this.letterGrade = letterGrade;
    }

    getValue() {
        return LETTER_GRADES[this.letterGrade] ?? 0;
    }
}

// ── GPA Manager (Business Logic) ──
class GPAManager {
    constructor() {
        this.semesterMap = {};  // { semesterName: [Course, ...] }
        this.loadData();
    }

    // ── Semester Operations ──
    addSemester(name) {
        if (name && !this.semesterMap.hasOwnProperty(name)) {
            this.semesterMap[name] = [];
            this.saveData();
            return true;
        }
        return false;
    }

    removeSemester(name) {
        if (this.semesterMap.hasOwnProperty(name)) {
            delete this.semesterMap[name];
            this.saveData();
            return true;
        }
        return false;
    }

    renameSemester(oldName, newName) {
        if (this.semesterMap.hasOwnProperty(oldName) &&
            !this.semesterMap.hasOwnProperty(newName) &&
            newName && newName.trim()) {
            // Preserve order by rebuilding the map
            const newMap = {};
            for (const [key, value] of Object.entries(this.semesterMap)) {
                if (key === oldName) {
                    newMap[newName] = value;
                } else {
                    newMap[key] = value;
                }
            }
            this.semesterMap = newMap;
            this.saveData();
            return true;
        }
        return false;
    }

    getSemesterNames() {
        return Object.keys(this.semesterMap);
    }

    getCourses(semesterName) {
        return this.semesterMap[semesterName] || [];
    }

    // ── Course Operations ──
    addCourse(semesterName, course) {
        if (this.semesterMap.hasOwnProperty(semesterName)) {
            this.semesterMap[semesterName].push(course);
            this.saveData();
        }
    }

    removeCourse(semesterName, index) {
        if (this.semesterMap.hasOwnProperty(semesterName)) {
            this.semesterMap[semesterName].splice(index, 1);
            this.saveData();
        }
    }

    updateCourse(semesterName, index, newCode, newCredit, newGrade) {
        if (this.semesterMap.hasOwnProperty(semesterName)) {
            const courses = this.semesterMap[semesterName];
            if (index >= 0 && index < courses.length) {
                courses[index].code = newCode;
                courses[index].credit = newCredit;
                courses[index].letterGrade = newGrade;
                this.saveData();
            }
        }
    }

    // ── GPA Calculations ──
    calculateSemesterGPA(semesterName) {
        const courses = this.semesterMap[semesterName];
        if (!courses || courses.length === 0) return 0.0;
        return this._calculateGPAForList(courses);
    }

    calculateTotalCGPA() {
        let totalPoints = 0;
        let totalCredits = 0;
        for (const courses of Object.values(this.semesterMap)) {
            for (const c of courses) {
                const value = LETTER_GRADES[c.letterGrade] ?? 0;
                totalPoints += c.credit * value;
                totalCredits += c.credit;
            }
        }
        return totalCredits > 0 ? totalPoints / totalCredits : 0.0;
    }

    calculateProjectedCGPA(currentGPA, currentTotalCredits, newCourses) {
        let totalPoints = currentGPA * currentTotalCredits;
        let totalCredits = currentTotalCredits;
        for (const c of newCourses) {
            const value = LETTER_GRADES[c.letterGrade] ?? 0;
            totalPoints += c.credit * value;
            totalCredits += c.credit;
        }
        return totalCredits > 0 ? totalPoints / totalCredits : 0.0;
    }

    _calculateGPAForList(courses) {
        let totalPoints = 0;
        let totalCredits = 0;
        for (const c of courses) {
            const value = LETTER_GRADES[c.letterGrade] ?? 0;
            totalPoints += c.credit * value;
            totalCredits += c.credit;
        }
        return totalCredits > 0 ? totalPoints / totalCredits : 0.0;
    }

    // ── Persistence ──
    saveData() {
        try {
            const data = {};
            for (const [name, courses] of Object.entries(this.semesterMap)) {
                data[name] = courses.map(c => ({
                    code: c.code,
                    credit: c.credit,
                    letterGrade: c.letterGrade
                }));
            }
            localStorage.setItem('gpa_data', JSON.stringify(data));
        } catch (e) {
            console.error('Error saving data:', e);
        }
    }

    loadData() {
        try {
            const raw = localStorage.getItem('gpa_data');
            if (raw) {
                const data = JSON.parse(raw);
                this.semesterMap = {};
                for (const [name, courses] of Object.entries(data)) {
                    this.semesterMap[name] = courses.map(c =>
                        new Course(c.code, c.credit, c.letterGrade)
                    );
                }
            }
        } catch (e) {
            console.error('Error loading data:', e);
            this.semesterMap = {};
        }
    }
}

// ── Application Controller ──
class App {
    constructor() {
        this.manager = new GPAManager();
        this.currentSemester = null;
        this.selectedProfileRow = -1;
        this.selectedGuestRow = -1;
        this.guestCourses = [];
        this.modalCallback = null;

        this._populateGradeSelects();
        this._bindGuestEvents();
    }

    // ── Screen Navigation ──
    showStartScreen() {
        this._switchScreen('start-screen');
    }

    showProfileScreen() {
        this._switchScreen('profile-screen');
        this._renderSemesterTabs();
        this._updateOverallGPA();

        // Select first semester if exists
        const names = this.manager.getSemesterNames();
        if (names.length > 0) {
            if (!this.currentSemester || !names.includes(this.currentSemester)) {
                this.currentSemester = names[0];
            }
            this._selectSemesterTab(this.currentSemester);
        } else {
            this.currentSemester = null;
            this._renderProfileTable();
        }
    }

    showGuestScreen() {
        this._switchScreen('guest-screen');
        this._renderGuestTable();
        this._updateProjectedGPA();
    }

    _switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        this.selectedProfileRow = -1;
        this.selectedGuestRow = -1;
    }

    // ── Semester Management ──
    addSemester() {
        this._openModal('Add Semester', 'Semester Name', '', (name) => {
            if (name && name.trim()) {
                if (this.manager.addSemester(name.trim())) {
                    this.currentSemester = name.trim();
                    this._renderSemesterTabs();
                    this._selectSemesterTab(name.trim());
                    this._updateOverallGPA();
                    this._showToast('Semester added', 'success');
                } else {
                    this._showToast('Semester already exists!', 'error');
                }
            }
        });
    }

    renameSemester() {
        if (!this.currentSemester) {
            this._showToast('No semester selected!', 'error');
            return;
        }
        this._openModal('Rename Semester', 'New Name', this.currentSemester, (newName) => {
            if (newName && newName.trim() && newName.trim() !== this.currentSemester) {
                if (this.manager.renameSemester(this.currentSemester, newName.trim())) {
                    this.currentSemester = newName.trim();
                    this._renderSemesterTabs();
                    this._selectSemesterTab(newName.trim());
                    this._showToast('Semester renamed', 'success');
                } else {
                    this._showToast('Name invalid or already exists!', 'error');
                }
            }
        });
    }

    deleteSemester() {
        if (!this.currentSemester) {
            this._showToast('No semester selected!', 'error');
            return;
        }
        this._openModal('Delete Semester', `Type "DELETE" to confirm deletion of "${this.currentSemester}"`, '', (input) => {
            if (input === 'DELETE') {
                this.manager.removeSemester(this.currentSemester);
                const names = this.manager.getSemesterNames();
                this.currentSemester = names.length > 0 ? names[0] : null;
                this._renderSemesterTabs();
                if (this.currentSemester) {
                    this._selectSemesterTab(this.currentSemester);
                } else {
                    this._renderProfileTable();
                }
                this._updateOverallGPA();
                this._showToast('Semester deleted', 'success');
            } else {
                this._showToast('Deletion cancelled', 'error');
            }
        });
    }

    _renderSemesterTabs() {
        const container = document.getElementById('tabs-scroll');
        container.innerHTML = '';
        const names = this.manager.getSemesterNames();

        names.forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn';
            btn.textContent = name;
            btn.dataset.semester = name;
            btn.addEventListener('click', () => {
                this.currentSemester = name;
                this._selectSemesterTab(name);
            });
            container.appendChild(btn);
        });
    }

    _selectSemesterTab(name) {
        this.currentSemester = name;
        this.selectedProfileRow = -1;
        this._clearProfileInputs();

        // Update tab active state
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.semester === name);
        });

        // Scroll tab into view
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        this._renderProfileTable();
        this._updateTermGPA();
    }

    // ── Profile Course Operations ──
    addCourseToProfile() {
        if (!this.currentSemester) {
            this._showToast('Create a semester first!', 'error');
            return;
        }

        const code = document.getElementById('profile-code').value.toUpperCase().trim();
        const creditStr = document.getElementById('profile-credit').value;
        const grade = document.getElementById('profile-grade').value;

        if (!code) { this._showToast('Enter a course code!', 'error'); return; }
        if (!creditStr || isNaN(parseInt(creditStr))) { this._showToast('Credit must be a number!', 'error'); return; }

        const credit = parseInt(creditStr);
        const course = new Course(code, credit, grade);
        this.manager.addCourse(this.currentSemester, course);

        this._renderProfileTable();
        this._updateTermGPA();
        this._updateOverallGPA();
        this._clearProfileInputs();
        this._showToast(`${code} added`, 'success');
    }

    updateCourseInProfile() {
        if (this.selectedProfileRow === -1) {
            this._showToast('Select a course to update!', 'error');
            return;
        }

        const code = document.getElementById('profile-code').value.toUpperCase().trim();
        const creditStr = document.getElementById('profile-credit').value;
        const grade = document.getElementById('profile-grade').value;

        if (!code) { this._showToast('Enter a course code!', 'error'); return; }
        if (!creditStr || isNaN(parseInt(creditStr))) { this._showToast('Credit must be a number!', 'error'); return; }

        const credit = parseInt(creditStr);
        this.manager.updateCourse(this.currentSemester, this.selectedProfileRow, code, credit, grade);

        this._renderProfileTable();
        this._updateTermGPA();
        this._updateOverallGPA();
        this.selectedProfileRow = -1;
        this._clearProfileInputs();
        this._showToast(`${code} updated`, 'success');
    }

    deleteCourseFromProfile() {
        if (this.selectedProfileRow === -1) {
            this._showToast('Select a course to delete!', 'error');
            return;
        }

        const courses = this.manager.getCourses(this.currentSemester);
        const code = courses[this.selectedProfileRow]?.code || '';
        this.manager.removeCourse(this.currentSemester, this.selectedProfileRow);

        this.selectedProfileRow = -1;
        this._renderProfileTable();
        this._updateTermGPA();
        this._updateOverallGPA();
        this._clearProfileInputs();
        this._showToast(`${code} deleted`, 'success');
    }

    _renderProfileTable() {
        const tbody = document.getElementById('profile-table-body');
        const emptyEl = document.getElementById('profile-empty');
        tbody.innerHTML = '';

        if (!this.currentSemester) {
            emptyEl.querySelector('p').textContent = 'Create a semester to get started.';
            emptyEl.classList.add('visible');
            return;
        }

        const courses = this.manager.getCourses(this.currentSemester);

        if (courses.length === 0) {
            emptyEl.querySelector('p').textContent = 'No courses yet. Add your first course below.';
            emptyEl.classList.add('visible');
        } else {
            emptyEl.classList.remove('visible');
        }

        courses.forEach((course, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${this._escapeHtml(course.code)}</td>
                <td>${course.credit}</td>
                <td>${course.letterGrade}</td>
                <td>${(LETTER_GRADES[course.letterGrade] ?? 0).toFixed(1)}</td>
            `;

            if (index === this.selectedProfileRow) {
                tr.classList.add('selected');
            }

            tr.addEventListener('click', () => {
                this._selectProfileRow(index, course);
            });

            tbody.appendChild(tr);
        });
    }

    _selectProfileRow(index, course) {
        if (this.selectedProfileRow === index) {
            // Deselect
            this.selectedProfileRow = -1;
            this._clearProfileInputs();
        } else {
            this.selectedProfileRow = index;
            document.getElementById('profile-code').value = course.code;
            document.getElementById('profile-credit').value = course.credit;
            document.getElementById('profile-grade').value = course.letterGrade;
        }

        // Update row highlighting
        document.querySelectorAll('#profile-table-body tr').forEach((tr, i) => {
            tr.classList.toggle('selected', i === this.selectedProfileRow);
        });
    }

    _clearProfileInputs() {
        document.getElementById('profile-code').value = '';
        document.getElementById('profile-credit').value = '';
        document.getElementById('profile-grade').selectedIndex = 0;
    }

    _updateTermGPA() {
        const val = this.currentSemester
            ? this.manager.calculateSemesterGPA(this.currentSemester)
            : 0;
        document.getElementById('term-gpa-value').textContent = val.toFixed(2);
    }

    _updateOverallGPA() {
        const val = this.manager.calculateTotalCGPA();
        document.getElementById('overall-gpa-value').textContent = val.toFixed(2);
    }

    // ── Guest Mode ──
    addCourseToGuest() {
        let code = document.getElementById('guest-code').value.toUpperCase().trim();
        const creditStr = document.getElementById('guest-credit').value;
        const grade = document.getElementById('guest-grade').value;

        if (!code) code = 'NEW';
        if (!creditStr || isNaN(parseInt(creditStr))) {
            this._showToast('Credit must be a number!', 'error');
            return;
        }

        const credit = parseInt(creditStr);
        this.guestCourses.push(new Course(code, credit, grade));

        this._renderGuestTable();
        this._updateProjectedGPA();
        document.getElementById('guest-code').value = '';
        document.getElementById('guest-credit').value = '';
        this._showToast(`${code} added`, 'success');
    }

    deleteCourseFromGuest() {
        if (this.selectedGuestRow === -1) {
            this._showToast('Select a course to delete!', 'error');
            return;
        }

        const code = this.guestCourses[this.selectedGuestRow]?.code || '';
        this.guestCourses.splice(this.selectedGuestRow, 1);
        this.selectedGuestRow = -1;

        this._renderGuestTable();
        this._updateProjectedGPA();
        this._showToast(`${code} deleted`, 'success');
    }

    _renderGuestTable() {
        const tbody = document.getElementById('guest-table-body');
        const emptyEl = document.getElementById('guest-empty');
        tbody.innerHTML = '';

        if (this.guestCourses.length === 0) {
            emptyEl.classList.add('visible');
        } else {
            emptyEl.classList.remove('visible');
        }

        this.guestCourses.forEach((course, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${this._escapeHtml(course.code)}</td>
                <td>${course.credit}</td>
                <td>${course.letterGrade}</td>
                <td>${(LETTER_GRADES[course.letterGrade] ?? 0).toFixed(1)}</td>
            `;

            if (index === this.selectedGuestRow) {
                tr.classList.add('selected');
            }

            tr.addEventListener('click', () => {
                if (this.selectedGuestRow === index) {
                    this.selectedGuestRow = -1;
                } else {
                    this.selectedGuestRow = index;
                }
                document.querySelectorAll('#guest-table-body tr').forEach((tr, i) => {
                    tr.classList.toggle('selected', i === this.selectedGuestRow);
                });
            });

            tbody.appendChild(tr);
        });
    }

    _updateProjectedGPA() {
        try {
            const gpaText = document.getElementById('guest-current-gpa').value.replace(',', '.');
            const creditText = document.getElementById('guest-current-credits').value;

            const currentGPA = gpaText ? parseFloat(gpaText) : 0;
            const currentCredits = creditText ? parseInt(creditText) : 0;

            if (isNaN(currentGPA) || isNaN(currentCredits)) {
                document.getElementById('projected-gpa-value').textContent = 'Invalid';
                return;
            }

            const projected = this.manager.calculateProjectedCGPA(currentGPA, currentCredits, this.guestCourses);
            document.getElementById('projected-gpa-value').textContent = projected.toFixed(2);
        } catch (e) {
            document.getElementById('projected-gpa-value').textContent = 'Error';
        }
    }

    _bindGuestEvents() {
        const gpaInput = document.getElementById('guest-current-gpa');
        const creditsInput = document.getElementById('guest-current-credits');

        if (gpaInput) gpaInput.addEventListener('input', () => this._updateProjectedGPA());
        if (creditsInput) creditsInput.addEventListener('input', () => this._updateProjectedGPA());
    }

    // ── Modal ──
    _openModal(title, placeholder, defaultValue, callback) {
        const overlay = document.getElementById('modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const inputEl = document.getElementById('modal-input');

        titleEl.textContent = title;
        inputEl.placeholder = placeholder;
        inputEl.value = defaultValue;
        this.modalCallback = callback;

        overlay.classList.add('active');

        // Focus input after animation
        setTimeout(() => inputEl.focus(), 300);
    }

    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('active');
        this.modalCallback = null;
    }

    confirmModal() {
        const inputEl = document.getElementById('modal-input');
        const value = inputEl.value;
        if (this.modalCallback) {
            this.modalCallback(value);
        }
        this.closeModal();
    }

    // ── Toast Notification ──
    _showToast(message, type = '') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast visible ' + type;

        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.classList.remove('visible');
        }, 2200);
    }

    // ── Utilities ──
    _populateGradeSelects() {
        const selects = [
            document.getElementById('profile-grade'),
            document.getElementById('guest-grade')
        ];

        selects.forEach(select => {
            if (!select) return;
            select.innerHTML = '';
            for (const [name, value] of Object.entries(LETTER_GRADES)) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = `${name} / ${value.toFixed(1)}`;
                select.appendChild(option);
            }
        });
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ── Handle Enter key in modal ──
document.getElementById('modal-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        app.confirmModal();
    }
});

// ── Handle Enter key in profile inputs ──
['profile-code', 'profile-credit'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (app.selectedProfileRow !== -1) {
                    app.updateCourseInProfile();
                } else {
                    app.addCourseToProfile();
                }
            }
        });
    }
});

// ── Handle Enter key in guest inputs ──
['guest-code', 'guest-credit'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                app.addCourseToGuest();
            }
        });
    }
});

// ── Initialize ──
const app = new App();

// ── Register Service Worker ──
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.log('SW registration failed:', err));
    });
}
