# api для сайта списка покупок

https://spamigor.ru/api, ssl - certbot.

## Документация под swagger по ссылке:
https://api.spamigor.ru/swagger

next.js, данные храним в mongodb

регистрация пользователей, доступ к данным через токен доступа

пароли в открытом виде не хранятся, все шифровано

запись списков, внесение изменений, удаление, распространение

выдача ключа для формирования uri для обеспечения доступа через get-запрос

обмен данными через post-запросы

внесение изменений в пользовательские данные

имеется валидация почты

добавлен телеграм-бот

имеются страницы для тг-бота для удобного внесения изменений через сам тг

развернут файловый сервер на multer для обработки документов и изображений

организован чат с разработчиком. История хранится в s3 хранилище чат работает с использованием socket.io
## использовать его могут только авторизованные пользователи 
пользователя добавляют в комнату, все сообщения рассылаются по комнате что позволяет использовать чат с одного аккаунта на нескольких вкладках/устройствах одновременно

в чате божно обмениваться картинками или документами. храниться они будут на сервере

на сервере сообщения попадают в буфер. запись в минио через 20с после последней активности с пользователем

можно писать оффлайн-пользователям. Если он зайдет ранее чем произойдет запись в минио, то получит сообщения из буфера. если позднее то из хранилища. в любом случае - получит

сообщения в адрес админа (меня) приходят мне в телеграм от бота(см. выше) картинки приходят как картинки, документы как документы. Если формат не подходит телеграму (например svg) придет просто ссылка на файл

с бота я могу отправить документ или картинку конкретному пользователю. Сервер получит ссылку на файл на сервере тг, стянет его оттуда, сгенерирует собственную ссылку и выдаст. Выдавать ссылку напрямую на адрес файла на сервере тг не безопасно. Сыылка содержит токен

## чат доступен по адресу: https://spamigor.ru/build или (если у меня таки дошли руки) https://spamigor.ru (как доделаю - поправлю)

На сайте со списком покупок (https://spamigor.ru/list) имеется возможность согласования списков. То есть если открыть один и тот же список на разных устройствах и начать с ним работать, то списки согласуются в реальном времени (удаления, изменения и галочки будут синхронизированы)

организовано это на socket.io
рассылка обновлений организована через комнаты. Клиент при подключении сообщает id активного списка покупок, сервер создает или забрасывает клиента в соответствующую комнату. При внесении изменений в список от автора изменений поступает сообщение. сервер его анализирует и отправляет в соответствующую комнату

логгирование с помощью logger. есть оповещение по e-mail на случай странных ситуаций
