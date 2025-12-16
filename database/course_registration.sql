-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 04, 2025 at 07:42 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `course_registration`
--

-- --------------------------------------------------------

--
-- Table structure for table `class_schedule`
--

CREATE TABLE `class_schedule` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `location` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `class_schedule`
--

INSERT INTO `class_schedule` (`id`, `course_id`, `day_of_week`, `start_time`, `end_time`, `location`) VALUES
(3, 2, 'Tuesday', '09:00:00', '10:30:00', 'Room 202'),
(4, 2, 'Thursday', '09:00:00', '10:30:00', 'Room 202'),
(5, 3, 'Monday', '14:00:00', '15:00:00', 'Room 303'),
(6, 3, 'Wednesday', '14:00:00', '15:00:00', 'Room 303'),
(7, 3, 'Friday', '14:00:00', '15:00:00', 'Room 303'),
(10, 5, 'Monday', '11:00:00', '12:30:00', 'Room 105'),
(11, 5, 'Wednesday', '11:00:00', '12:30:00', 'Room 105');

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` int(11) NOT NULL,
  `course_code` varchar(20) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `instructor` varchar(100) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `credits` int(11) DEFAULT 3,
  `schedule` varchar(100) DEFAULT NULL,
  `max_students` int(11) DEFAULT 30,
  `current_students` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `course_code`, `title`, `description`, `instructor`, `department`, `credits`, `schedule`, `max_students`, `current_students`, `created_at`, `updated_at`) VALUES
(2, 'MATH201', 'Calculus II', 'Advanced topics in differential and integral calculus', 'Prof. Michael Chen', 'Mathematics', 4, 'Tue/Thu 9:00-10:30', 25, 1, '2025-12-01 06:46:49', '2025-12-03 17:27:04'),
(3, 'ENG102', 'Academic Writing', 'Developing writing skills for academic purposes', 'Dr. Emily Wilson', 'English', 3, 'Mon/Wed/Fri 14:00-15:00', 35, 1, '2025-12-01 06:46:49', '2025-12-03 17:25:00'),
(5, 'BIO202', 'Cell Biology', 'Structure and function of cells', 'Dr. Lisa Thompson', 'Biology', 3, 'Mon/Wed 11:00-12:30', 30, 0, '2025-12-01 06:46:49', '2025-12-03 17:27:11'),
(6, 'CS101', 'Introduction to Computer Science', 'computer science', 'Dr. Sarah Johnson', 'Computer Science', 3, '[object Object],[object Object]', 30, 0, '2025-12-02 13:42:31', '2025-12-03 17:25:14'),
(7, 'CS1022', 'Introduction to Computer Science 11', 'Introduction to Computer Science 11', 'Dr. Sarah Johnson', 'Computer Science11', 3, '[object Object],[object Object]', 12, 0, '2025-12-02 13:51:07', '2025-12-03 09:32:14'),
(8, 'Data Science', 'Introduction to Data Science', 'Introduction to Data Science', 'Prof. Michael Chen', 'Computer Science', 3, '[object Object],[object Object]', 35, 0, '2025-12-04 06:40:21', '2025-12-04 06:40:21');

-- --------------------------------------------------------

--
-- Table structure for table `registrations`
--

CREATE TABLE `registrations` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `registration_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('registered','dropped') DEFAULT 'registered',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `registrations`
--

INSERT INTO `registrations` (`id`, `student_id`, `course_id`, `registration_date`, `status`, `updated_at`) VALUES
(1, 2, 7, '2025-12-03 08:56:56', 'dropped', '2025-12-03 09:32:14'),
(3, 2, 6, '2025-12-03 09:32:06', 'dropped', '2025-12-03 17:25:14'),
(4, 2, 2, '2025-12-03 11:45:29', 'registered', '2025-12-03 17:27:04'),
(5, 2, 3, '2025-12-03 17:25:00', 'registered', '2025-12-03 17:25:00'),
(6, 2, 5, '2025-12-03 17:25:06', 'dropped', '2025-12-03 17:27:11');

--
-- Triggers `registrations`
--
DELIMITER $$
CREATE TRIGGER `after_registration_insert` AFTER INSERT ON `registrations` FOR EACH ROW BEGIN
    -- Only update if status is 'registered'
    IF NEW.status = 'registered' THEN
        -- Update course current_students count
        UPDATE courses 
        SET current_students = current_students + 1 
        WHERE id = NEW.course_id;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_registration_update` AFTER UPDATE ON `registrations` FOR EACH ROW BEGIN
    -- If status changed from registered to dropped
    IF OLD.status = 'registered' AND NEW.status = 'dropped' THEN
        -- Decrease course current_students count
        UPDATE courses 
        SET current_students = current_students - 1 
        WHERE id = NEW.course_id;
    
    -- If status changed from dropped to registered
    ELSEIF OLD.status = 'dropped' AND NEW.status = 'registered' THEN
        -- Increase course current_students count
        UPDATE courses 
        SET current_students = current_students + 1 
        WHERE id = NEW.course_id;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `role` enum('student','admin') DEFAULT 'student',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `full_name`, `role`, `created_at`, `updated_at`) VALUES
(2, 'girisha', 'girisha2536@gmail.com', '$2a$10$LgkndXvO3fNPPgkPpCBjfulAmhUCntzNWRjEDK1bwz4USvEsxMg42', 'Girisaa Priyadharsini M', 'student', '2025-12-01 07:29:49', '2025-12-01 07:29:49'),
(3, 'saralearn', 'saracozy7@gmail.com', '$2a$10$2gDGkKf8Uo1r9JIpJQSLYuwWWVWSHnh7ggiBKOePli.onZBpZzK9m', 'Sara', 'student', '2025-12-01 14:38:39', '2025-12-01 14:38:39'),
(4, 'divyakeerthi', 'diviya234@gmail.com', '$2a$10$XKazPzVaLQhbiMRbO.IV5OdUwVq/JwTvxTeM0gYhE8EDf02x1XMxC', 'divya', 'student', '2025-12-01 15:08:57', '2025-12-01 15:08:57'),
(7, 'Adminss', 'admin12@gmail.com', '$2a$10$LvXVG/3NBpPvVOKcaX67zOF5/MUXM2JeAIjUDmydGU2Xt0u55ucSe', 'Adminss', 'admin', '2025-12-02 12:47:05', '2025-12-02 12:47:05');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `class_schedule`
--
ALTER TABLE `class_schedule`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_class_schedule_course` (`course_id`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `course_code` (`course_code`),
  ADD KEY `idx_courses_department` (`department`);

--
-- Indexes for table `registrations`
--
ALTER TABLE `registrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_registration` (`student_id`,`course_id`),
  ADD KEY `idx_registrations_student` (`student_id`),
  ADD KEY `idx_registrations_course` (`course_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `class_schedule`
--
ALTER TABLE `class_schedule`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `registrations`
--
ALTER TABLE `registrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `class_schedule`
--
ALTER TABLE `class_schedule`
  ADD CONSTRAINT `fk_class_schedule_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `registrations`
--
ALTER TABLE `registrations`
  ADD CONSTRAINT `fk_registration_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_registration_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `registrations_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `registrations_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
