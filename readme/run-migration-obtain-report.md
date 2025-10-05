# Overview

The migration script reads asset details from an input CSV file and generates two types of output files in a specified output folder: a log file (in JSONL format) and a migration report (in CSV format).

- **Log File**: Think of this as a comprehensive record for each asset migration.
- **Migration Report**: Produced from the Log File. Combines the initial input for each asset (from the input CSV file) with additional columns indicating the migration status.

To avoid accidental overwrites, the script will terminate if directed to an existing output folder. This design encourages you to use a unique folder for each migration round, preserving data from previous rounds. For example:

- `round1-initial` for the initial migration run
- `round2-recovery` for a second attempt focusing on assets that failed during the initial run
- ...and so on.

Also, you'll need to specify the number of concurrent Cloudinary Upload API invocations the script should make. To minimize the risk of receiving `420` status codes, we recommend setting this value to `20`.

# Running over SSH

For large-scale migrations, we advise running the script on a cloud-hosted VM. See the [Provision Runtime](./provision-runtime.md) section for guidance. If using this approach, ensure you're using a terminal multiplexer like `screen` or `tmux` to prevent the migration from terminating if the SSH connection drops.

# Invocation

Run the migration script as follows:

```bash
# If running over SSH, use a terminal multiplexer 
# This ensures the script is not terminated when SSH connection is terminated or times out
screen -S "cld_migration"

# Run the migration script with the following command
node ./cld-bulk.js migrate \
    --from-csv-file /path/to/input/file.csv \
    --output-folder /path/to/output/folder/for/this/migration/round \
    --max-concurrent-uploads 20
```

# Monitoring for errors

The migration script keeps updating the `log.jsonl` file in the specified output folder.

Oftentime when errors do occur it is helpful to know what types of errors those are (network "hiccups" or incorrect upload API parameters).

To assist with monitoring an ongoing bulk migration the following scripts are available with the tool.

## Script to count tally of operations performed so far

```bash
# Assumes you are in the root folder of the repository
monitor-migration/count-log-ops.sh  path/to/ongoing/migration/log.jsonl
```

Provides output such as:
```
🟢 Created            : 987
🟡 Overwritten        : 65
⚪️ Existing (skipped) : 43
🔴 Failed             : 21
```

## Script to output information for all failed operations
```bash
# Assumes you are in the root folder of the repository
monitor-migration/trace-failed-log-ops.sh  path/to/ongoing/migration/log.jsonl
```

Provides output such as:
```
{"error":{"message":"Request Timeout","http_code":499,"name":"TimeoutError"}}
{"message":"Error in loading https://test.img/url - 503 Service Unavailable","name":"Error","http_code":400}
{"error":{"message":"Request Timeout","http_code":499,"name":"TimeoutError"}}
{"error":{"message":"Request Timeout","http_code":499,"name":"TimeoutError"}}
{"message":"Server returned unexpected status code - 502","http_code":502,"name":"UnexpectedResponse"}
```
