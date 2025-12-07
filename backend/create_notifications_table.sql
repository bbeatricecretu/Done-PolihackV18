-- Create Notifications table for tracking sent notifications and managing cooldown periods
-- This prevents duplicate notifications and enforces a 1-hour cooldown for location-based alerts

CREATE TABLE Notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    task_id UNIQUEIDENTIFIER NOT NULL,
    last_sent_time DATETIME2(7) NOT NULL DEFAULT GETDATE(),
    notification_count INT NOT NULL DEFAULT 1,
    notification_type NVARCHAR(50) NULL,
    
    CONSTRAINT FK_Notifications_Tasks FOREIGN KEY (task_id) 
        REFERENCES Tasks(id) ON DELETE CASCADE,
    
    CONSTRAINT UQ_Notifications_TaskType UNIQUE (task_id, notification_type)
);

-- Create indexes for efficient cooldown checks and queries
CREATE INDEX IX_Notifications_TaskId_Type_Time 
    ON Notifications(task_id, notification_type, last_sent_time);

CREATE INDEX IX_Notifications_Type_Time 
    ON Notifications(notification_type, last_sent_time);

-- Comments for documentation
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Tracks sent notifications to prevent duplicates and manage cooldown periods (1 hour for location-based alerts)',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'Notifications';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Number of times this notification has been sent for this task',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'Notifications',
    @level2type = N'COLUMN', @level2name = N'notification_count';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Type of notification: location, due_date, weather, time, etc.',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'Notifications',
    @level2type = N'COLUMN', @level2name = N'notification_type';
