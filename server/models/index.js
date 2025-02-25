const { Sequelize, DataTypes } = require('sequelize');

// 创建 Sequelize 实例
const sequelize = new Sequelize('network-project', 'root', '123456', {
  host: 'localhost',
  dialect: 'mysql'
});

// 定义用户模型
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  last_login_time: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'offline'
  }
}, {
  tableName: 'users'
});

// 定义消息模型
const Message = sequelize.define('Message', {
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  receiver_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// 设置关联关系
Message.belongsTo(User, { as: 'sender', foreignKey: 'sender_id' });
Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiver_id' });

// 定义文件传输模型
const FileTransfer = sequelize.define('FileTransfer', {
  sender_id: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  receiver_id: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  file_name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  file_size: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  transfer_status: {
    type: Sequelize.STRING,
    defaultValue: 'in_progress'
  },
  progress: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  timestamp: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW
  },
  is_paused: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }
});

// 设置关联关系
FileTransfer.belongsTo(User, { as: 'sender', foreignKey: 'sender_id' });
FileTransfer.belongsTo(User, { as: 'receiver', foreignKey: 'receiver_id' });

// 同步数据库
sequelize.sync();

module.exports = { User, Message, FileTransfer, sequelize };