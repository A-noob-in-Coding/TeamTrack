-- Create User table
CREATE TABLE "User" (
    UserID SERIAL PRIMARY KEY,
    Password VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    FirstName VARCHAR(100) NOT NULL,
    LastName VARCHAR(100) NOT NULL,
    Bio TEXT
);

-- Create Team table
CREATE TABLE Team (
    TeamID SERIAL PRIMARY KEY,
    CreatedBy INTEGER NOT NULL,
    TeamName VARCHAR(100) NOT NULL,
    FOREIGN KEY (CreatedBy) REFERENCES "User"(UserID) ON DELETE CASCADE
);

-- Create Task table
CREATE TABLE Task (
    TaskID SERIAL PRIMARY KEY,
    TeamID INTEGER NOT NULL,
    AssignedTo INTEGER,
    Title VARCHAR(255) NOT NULL,
    Description TEXT,
    DueDate DATE,
    Status VARCHAR(50) DEFAULT 'Pending',
    FOREIGN KEY (TeamID) REFERENCES Team(TeamID) ON DELETE CASCADE,
    FOREIGN KEY (AssignedTo) REFERENCES "User"(UserID) ON DELETE SET NULL
);

-- Create Membership table (junction table for User-Team many-to-many relationship)
CREATE TABLE Membership (
    MembershipID SERIAL PRIMARY KEY,
    UserID INTEGER NOT NULL,
    TeamID INTEGER NOT NULL,
    Role VARCHAR(50) DEFAULT 'Member',
    FOREIGN KEY (UserID) REFERENCES "User"(UserID) ON DELETE CASCADE,
    FOREIGN KEY (TeamID) REFERENCES Team(TeamID) ON DELETE CASCADE,
    UNIQUE(UserID, TeamID) -- Prevent duplicate memberships
);

-- Create indexes for better performance
CREATE INDEX idx_task_team ON Task(TeamID);
CREATE INDEX idx_task_assigned ON Task(AssignedTo);
CREATE INDEX idx_membership_user ON Membership(UserID);
CREATE INDEX idx_membership_team ON Membership(TeamID);
CREATE INDEX idx_team_creator ON Team(CreatedBy);

-- Add some constraints for data integrity
ALTER TABLE Task ADD CONSTRAINT chk_status 
    CHECK (Status IN ('Pending', 'In Progress', 'Completed', 'Cancelled'));

ALTER TABLE Membership ADD CONSTRAINT chk_role 
    CHECK (Role IN ('Admin', 'Member', 'Viewer'));

-- Comments for documentation
COMMENT ON TABLE "User" IS 'Stores user account information';
COMMENT ON TABLE Team IS 'Stores team information with creator reference';
COMMENT ON TABLE Task IS 'Stores task information assigned to teams and users';
COMMENT ON TABLE Membership IS 'Junction table for user-team relationships with roles';