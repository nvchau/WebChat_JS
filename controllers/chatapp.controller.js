var Member    = require('../models/member');
var Group     = require('../models/groupchat');
var Messages  = require('../models/messages');

// import {lastItemOfArray, convertTimestampToHumanTime} from '../helper/clientHelper';

exports.home = (req, res, next) => {
    // console.log(req.session.user._id)
    let messagesWelcome = req.flash('messagesWelcome'); // message nhận từ flash của login
    if (messagesWelcome.length > 0) {
        messagesWelcome = messagesWelcome[0];
    } else {
        messagesWelcome = null;
    }

    let messagesChangepassword = req.flash('messagesChangepassword'); //message nhận từ flash của changepassword
    if (messagesChangepassword.length > 0) {
        messagesChangepassword = messagesChangepassword[0];
    } else {
        messagesChangepassword = null;
    }

    let messageEditProfile = req.flash('messageEditProfile'); //message nhận từ flash của edit profile
    if (messageEditProfile.length > 0) {
        messageEditProfile = messageEditProfile[0];
    } else {
        messageEditProfile = null;
    }
    
    Member.find().then(member => { //{ _id: req.session.user._id }
        Group.find().then(group => {
            Messages.find().sort({createdAt: 1}).then(messages => { //.sort({createdAt: 1}): sắp xếp theo thời gian giản dần
                res.render('frontend/chatapp/home', {
                    pageTitle: 'WebChat',
                    member   : member,
                    group    : group,
                    messages : messages,
                    messagesWelcome : messagesWelcome,
                    messagesChangepassword : messagesChangepassword,
                    messageEditProfile : messageEditProfile
                })
            })
        })
    })
    .catch(err => console.log(err));
}

// gửi tin nhắn mới
exports.addNewTextEmoji = (req, res, next) => {
    try {
        // thông tin người gửi tn (người dùng hiện tại - current user)
        let sender = {
            id: req.session.user._id,
            name: req.session.user.info.firstname + ' ' + req.session.user.info.lastname,
            avatar: req.session.user.image_path
        };

        // lấy dữ liệu từ phía client truyền lên (từ file textAndEmojiChat.js)
        let receiverId = req.body.uid;
        let messagaVal = req.body.messagaVal;
        let isChatGroup = req.body.isChatGroup;

        let newMessage = new Messages();

        // kiểm tra xem chat cá nhân hay nhóm
        if (isChatGroup) {
            var conversType = 'group';

            // lấy thông tin người nhận tn thông qua id truyền từ client
            Group.findOne({_id: receiverId}).then(receiverFind => {

                let receiver = {
                    id: receiverFind._id,
                    name: receiverFind.name,
                    avatar: receiverFind.image_path
                }

                newMessage.senderId = req.session.user._id;
                newMessage.receiverId = receiverId;
                newMessage.conversationType = conversType;
                newMessage.messageType = 'text';
                newMessage.sender = sender;
                newMessage.receiver = receiver;
                newMessage.text = messagaVal;
                newMessage.createdAt = new Date();

                newMessage.save();
                return res.status(200).send({message: newMessage});
            });

        } else {
            var conversType = 'personal';

            // lấy thông tin người nhận tn thông qua id truyền từ client
            Member.findOne({_id: receiverId}).then(receiverFind => {

                let receiver = {
                    id: receiverFind._id,
                    name: receiverFind.info.firstname + ' ' + receiverFind.info.lastname,
                    avatar: receiverFind.image_path
                }

                newMessage.senderId = req.session.user._id;
                newMessage.receiverId = receiverId;
                newMessage.conversationType = conversType;
                newMessage.messageType = 'text';
                newMessage.sender = sender;
                newMessage.receiver = receiver;
                newMessage.text = messagaVal;
                newMessage.createdAt = new Date();

                newMessage.save();
                return res.status(200).send({message: newMessage});
            });
        }

    } catch (error) {
        return res.status(500).send(error);
    }

}

// tìm kiếm user để thêm vào group chat
exports.searchUsers = (req, res, next) => {
    try {
        let currentUserId = req.session.user._id;
        let keywork = req.params.keywork;
        // tìm kiếm theo email hoặc tên
        Member.find({
            $or: [
                {"local.email": new RegExp(keywork, 'i')},
                {"info.firstname": new RegExp(keywork, 'i')},
                {"info.lastname": new RegExp(keywork, 'i')}
            ]
        })
        .then(usersListSearch => {
            return res.status(200).send({usersListSearch: usersListSearch});
        })
        .catch(error => {
            return res.status(500).send(error);
        });
    } catch (error) {
        return res.status(500).send(error);
    }
}

exports.createGroupChat = (req, res, next) => {
    try {
        let currentUserId = req.session.user._id;

        let arrayIds = req.body.arrayIds;
        let groupChatName = req.body.groupChatName;

        var listUserId = JSON.parse(arrayIds); // đưa JSON về lại array
        listUserId.push(currentUserId); // thêm current userId vào mảng memberId

        let newGroup = new Group();

        newGroup.status     = "ACTIVE";
        newGroup.name       = groupChatName;
        newGroup.user_id    = currentUserId;
        newGroup.image_path = "images/avatar/avatar-group.png";
        newGroup.members    = listUserId;
        newGroup.createdAt  = new Date();

        // tìm các user là member của group mới được tạo
        Member.find({
            '_id': { $in: listUserId }
        }, function(err, memberList) {
            // console.log(userData);
            // lưu group mới tạo vào db và gửi trả về cho client
            newGroup.save(function (error, docs) {
                if (error) {
                    return res.status(500).send(error);
                }

                return res.status(200).send({
                    groupData: docs, // dữ liệu của group mới tạo
                    memberList: memberList // danh sách member
                });
            });
        });

    } catch (error) {
        return res.status(500).send(error);
    }
}

