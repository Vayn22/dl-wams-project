from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("patients", "0002_expand_patient_and_add_appointment_file"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="date_of_birth",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="blood_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("A+", "A+"),
                    ("A-", "A-"),
                    ("B+", "B+"),
                    ("B-", "B-"),
                    ("AB+", "AB+"),
                    ("AB-", "AB-"),
                    ("O+", "O+"),
                    ("O-", "O-"),
                ],
                max_length=5,
                null=True,
            ),
        ),
        migrations.AlterModelOptions(
            name="patient",
            options={
                "permissions": [
                    ("archive_patient", "Can archive patient"),
                    ("export_patient", "Can export patient data"),
                ]
            },
        ),
        migrations.AlterModelOptions(
            name="appointment",
            options={
                "permissions": [
                    ("cancel_appointment", "Can cancel appointment"),
                    ("reschedule_appointment", "Can reschedule appointment"),
                ]
            },
        ),
        migrations.AlterModelOptions(
            name="medicalfile",
            options={
                "permissions": [
                    ("download_medicalfile", "Can download medical file"),
                ]
            },
        ),
    ]
