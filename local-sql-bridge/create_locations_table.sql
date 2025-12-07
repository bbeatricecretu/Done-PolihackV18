-- Create TaskLocations table to store nearby places for tasks
-- This allows multiple locations (1:N relationship) per task
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TaskLocations' AND xtype='U')
BEGIN
    CREATE TABLE TaskLocations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        task_id UNIQUEIDENTIFIER NOT NULL, -- Foreign key to Tasks table
        name NVARCHAR(255) NOT NULL,
        address NVARCHAR(500),
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        place_id NVARCHAR(100), -- Google Place ID to avoid duplicates
        rating FLOAT,
        is_open BIT,
        distance_meters FLOAT,
        created_at DATETIME2 DEFAULT GETDATE(),
        
        CONSTRAINT FK_TaskLocations_Tasks FOREIGN KEY (task_id) 
        REFERENCES Tasks(id) 
        ON DELETE CASCADE
    );

    -- Index for faster lookups by task
    CREATE INDEX IX_TaskLocations_TaskId ON TaskLocations(task_id);
END
GO
