====================================================================
           CAREVISTA HOSPITAL MANAGEMENT SAAS (HMS)
                   QUICK START GUIDE & README
====================================================================

Welcome to CareVista Hospital Management SaaS!
You do NOT need any programming or command-line experience to run 
and use this application. Everything runs automatically.

--------------------------------------------------------------------
HOW TO START AND USE CAREVISTA
--------------------------------------------------------------------

STEP 1: START THE APPLICATION
  Double-click the file named:
  >>> START_HOSPITAL_SAAS.bat <<<

STEP 2: WAIT A FEW SECONDS
  The script will automatically:
  - Check your Java 21 environment.
  - Check your Maven build system.
  - Verify that the MySQL database service (MySQL80) is running.
  - Verify web port availability (Port 8082).
  - Launch the CareVista Spring Boot server.

STEP 3: YOUR BROWSER WILL OPEN AUTOMATICALLY
  Once the server is ready, your default web browser will automatically 
  open to the CareVista login page:
  http://localhost:8082/

STEP 4: SELECT YOUR ROLE & SIGN IN
  At the top of the login box, choose which role you are logging in as:
  [ Super Admin ]   [ Admin ]   [ Employee ]

  Enter your Email and Password, or click any of the "Quick-Fill Demo" 
  pills at the bottom of the card to test instantly:

  1. SUPER ADMIN (SaaS Platform Owner)
     Email:    superadmin@carevista.com
     Password: SuperAdmin@123

  2. HOSPITAL ADMIN (City Care Super Speciality Hospital)
     Email:    admin@citycare.com
     Password: Admin@123

  3. HOSPITAL EMPLOYEE (Front Desk & Outpatient Desk)
     Email:    reception@citycare.com
     Password: Employee@123

STEP 5: USE THE APPLICATION
  - Super Admin Dashboard: SaaS-wide governance, hospital tenant list, OP limits.
  - Hospital Admin Dashboard: Daily clinical counts, OP/IP, pharmacy, lab, collection.
  - Employee Workstation: Outpatient desk, patient registry, and billing access.

STEP 6: SHUT DOWN WHEN FINISHED
  When you are done using CareVista, double-click:
  >>> STOP_HOSPITAL_SAAS.bat <<<
  This cleanly stops the CareVista web server while preserving your MySQL 
  database and data safely.

--------------------------------------------------------------------
SYSTEM ARCHITECTURE & PORTS
--------------------------------------------------------------------
- Application Web Port: http://localhost:8082/
  CareVista is configured to run on port 8082 so that any existing 
  background database services (such as Postgres Enterprise Manager 
  HTTPD on port 8080) are never disturbed or modified.
- Database: MySQL 8.x (localhost:3306)
  CareVista connects strictly to local MySQL (MySQL80 service).

--------------------------------------------------------------------
BASIC TROUBLESHOOTING & COMMON QUESTIONS
--------------------------------------------------------------------

Q: The browser did not open automatically. What should I do?
A: Open Google Chrome, Microsoft Edge, or Mozilla Firefox and type:
   http://localhost:8082/
   into your address bar and press Enter.

Q: What if MySQL database is not connected?
A: Check that the Windows "MySQL80" service is running:
   1. Press Windows Key + R, type 'services.msc', and press Enter.
   2. Locate 'MySQL80' in the list.
   3. Make sure its status says 'Running'. If not, right-click and select 'Start'.

Q: How is my hospital data protected?
A: All passwords are encrypted using industry-standard BCrypt hashing.
   Tenant isolation ensures that data from one hospital is strictly 
   invisible and inaccessible to other hospitals.

============================================================
CareVista Hospital Management SaaS - Enterprise Healthcare System
============================================================
