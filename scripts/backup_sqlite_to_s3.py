#!/usr/bin/env python3
"""
Upload the SQLite DB file to S3 as a timestamped backup.

Required environment variables:
 - USERS_DB_PATH (default: /data/users.db)
 - AWS_ACCESS_KEY_ID
 - AWS_SECRET_ACCESS_KEY
 - AWS_REGION
 - S3_BUCKET

Run as a Scheduled Job in Render: `python scripts/backup_sqlite_to_s3.py`
"""
import os
import sys
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from datetime import datetime


def main():
    users_db_path = os.getenv("USERS_DB_PATH", "/data/users.db")
    s3_bucket = os.getenv("S3_BUCKET")
    region = os.getenv("AWS_REGION")

    if not s3_bucket:
        print("S3_BUCKET not set. Skipping backup.")
        sys.exit(1)

    if not os.path.exists(users_db_path):
        print(f"Users DB not found at {users_db_path}. Nothing to back up.")
        sys.exit(0)

    ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    key = f"backups/users.db.{ts}"

    try:
        session = boto3.session.Session()
        s3 = session.client("s3", region_name=region)
        print(f"Uploading {users_db_path} -> s3://{s3_bucket}/{key}")
        with open(users_db_path, "rb") as f:
            s3.upload_fileobj(f, s3_bucket, key)
        print("Backup complete")
    except (BotoCoreError, ClientError) as e:
        print("S3 upload failed:", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
