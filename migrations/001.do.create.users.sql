create table users(
  id int4 primary key generated by default as identity,
  first_name text not null,
  last_name text not null,
  email text not null,
  user_password text not null
);